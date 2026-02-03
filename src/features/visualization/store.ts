import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import Graph from 'graphology';
import { type ICruiseResult } from '../../schema/dependency-cruiser';
import { createGraphFromCruiseResult, transformToReactFlow } from './logic/transformer';
import { applyDagreLayout } from './logic/layout';
import { applyElkLayout } from './logic/layout-elk';
import { type ModuleCategory } from './logic/filters';
import { calculateGraphMetrics, getHealthStatus } from './logic/metrics';
import { type AppNodeData, type GroupNodeData, type ComplexityMetricsMap } from './types';

const HIGHLIGHTED_EDGE_STYLE = { stroke: '#60a5fa', strokeWidth: 2, opacity: 1 };
const DIMMED_EDGE_STYLE = { stroke: '#334155', strokeWidth: 1, opacity: 0.2 };

export type ViewMode = 'standard' | 'instability';
export type NodeSizeMode = 'uniform' | 'centrality';
export type LayoutEngine = 'dagre' | 'elk';

interface GraphState {
  // React Flow State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Graphology Instance (Headless Graph)
  // We mark it as potentially undefined until loaded
  graph: Graph | null;
  originalGraph: Graph | null;

  // Metadata
  hasUnsavedChanges: boolean;
  loading: boolean;
  isCalculatingMetrics: boolean;
  metricsVersion: number;
  hideTypeDefinitions: boolean;
  layoutDirection: 'TB' | 'LR';
  activeFilters: ModuleCategory[];
  isInspectorOpen: boolean;
  rawComplexityMetrics: ComplexityMetricsMap | null;
  viewMode: ViewMode;
  nodeSize: NodeSizeMode;
  layoutEngine: LayoutEngine;

  // Actions
  setInspectorOpen: (isOpen: boolean) => void;
  setGraphData: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => void;
  calculateMetrics: (version?: number) => void;
  layoutGraph: (direction?: 'TB' | 'LR') => Promise<void>;
  setLayoutEngine: (engine: LayoutEngine) => void;
  selectNode: (nodeId: string | null, shouldOpenInspector?: boolean) => void;
  toggleTypeDefinitions: () => void;
  setFilter: (filter: ModuleCategory | 'all') => void;
  setViewMode: (mode: ViewMode) => void;
  setNodeSize: (mode: NodeSizeMode) => void;
  reset: () => void;
  resetSimulation: () => void;
  reparentNode: (nodeId: string, newParentId: string | undefined, newPosition: { x: number; y: number }) => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

// Robust storage implementation that falls back to in-memory storage if localStorage is missing
const robustStorage = {
  getItem: (name: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(name);
    }
    return null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(name);
    }
  },
};

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => {
      // Pure helper to compute graph state updates without causing side effects
      const computeGraphStateUpdate = (graph: Graph) => {
        const { hideTypeDefinitions, layoutDirection, activeFilters } = get();

        // Transform to React Flow
        const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions, activeFilters });

        // Apply Layout (Default to Dagre synchronously for immediate feedback)
        const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

        return {
          nodes: layouted.nodes,
          edges: layouted.edges,
          selectedNodeId: null,
          loading: false,
          hasUnsavedChanges: false
        };
      };

      return {
        nodes: [],
        edges: [],
        selectedNodeId: null,
        graph: null,
        originalGraph: null,
        hasUnsavedChanges: false,
        loading: false,
        isCalculatingMetrics: false,
        metricsVersion: 0,
        hideTypeDefinitions: true,
        layoutDirection: 'TB',
        activeFilters: [],
        isInspectorOpen: false,
        rawComplexityMetrics: null,
        viewMode: 'standard',
        nodeSize: 'uniform',
        layoutEngine: 'dagre',

        setInspectorOpen: (isOpen: boolean) => {
          set({ isInspectorOpen: isOpen });
        },

        setViewMode: (mode: ViewMode) => {
          set({ viewMode: mode });
        },

        setNodeSize: (mode: NodeSizeMode) => {
          set({ nodeSize: mode });
        },

        setLayoutEngine: (engine: LayoutEngine) => {
          set({ layoutEngine: engine });
          // Trigger re-layout
          void get().layoutGraph();
        },

        setGraphData: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => {
          set((state) => ({
            loading: true,
            metricsVersion: state.metricsVersion + 1,
            rawComplexityMetrics: complexityMetrics || null
          }));

          const newVersion = get().metricsVersion;

          // 1. Transform to Graphology
          const graph = createGraphFromCruiseResult(data);
          const originalGraph = graph.copy();

          // 2. Compute state (Synchronous Dagre)
          const computedState = computeGraphStateUpdate(graph);

          set({
            ...computedState,
            graph,
            originalGraph,
          });

          // 3. Trigger Metrics
          get().calculateMetrics(newVersion);

          // 4. Trigger ELK Layout if selected (Async override)
          if (get().layoutEngine === 'elk') {
            void get().layoutGraph();
          }
        },

        calculateMetrics: (version?: number) => {
          const targetVersion = version ?? get().metricsVersion;
          const { graph, rawComplexityMetrics } = get();
          if (!graph) return;

          if (get().metricsVersion !== targetVersion) return;

          set({ isCalculatingMetrics: true });

          try {
            const folderMetrics = calculateGraphMetrics(graph, rawComplexityMetrics);

            if (get().metricsVersion !== targetVersion) return;

            const currentNodes = get().nodes;
            const updatedNodes = currentNodes.map((node) => {
              if (graph.hasNode(node.id)) {
                const attributes = graph.getNodeAttributes(node.id) as Partial<AppNodeData>;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    metrics: attributes.metrics,
                    healthStatus: attributes.healthStatus,
                    debugColor: attributes.debugColor
                  } as AppNodeData
                };
              } else if (node.type === 'groupNode' && folderMetrics[node.id]) {
                const metrics = folderMetrics[node.id];
                const healthStatus = metrics?.compoundScore !== undefined
                  ? getHealthStatus(metrics.compoundScore)
                  : 'healthy';

                return {
                  ...node,
                  data: {
                    ...node.data,
                    metrics,
                    healthStatus
                  } as GroupNodeData
                };
              }
              return node;
            });

            set({ nodes: updatedNodes });

          } catch (error) {
            console.error("Failed to calculate metrics:", error);
          } finally {
            if (get().metricsVersion === targetVersion) {
              set({ isCalculatingMetrics: false });
            }
          }
        },

        toggleTypeDefinitions: () => {
          const { graph, hideTypeDefinitions, selectedNodeId, layoutDirection, activeFilters, layoutEngine } = get();
          if (!graph) return;

          const newValue = !hideTypeDefinitions;

          // Re-transform with new filter (and sync Dagre layout)
          const { nodes, edges } = transformToReactFlow(graph, {
            hideTypeDefinitions: newValue,
            activeFilters
          });

          // Apply initial Dagre layout
          const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

          set({
            hideTypeDefinitions: newValue,
            nodes: layouted.nodes,
            edges: layouted.edges,
          });

          if (selectedNodeId) {
            get().selectNode(selectedNodeId);
          }

          // Re-apply ELK if needed
          if (layoutEngine === 'elk') {
            void get().layoutGraph();
          }
        },

        setFilter: (filter: ModuleCategory | 'all') => {
          const { graph, hideTypeDefinitions, layoutDirection, activeFilters, layoutEngine } = get();
          if (!graph) return;

          let newFilters: ModuleCategory[];

          if (filter === 'all') {
            newFilters = [];
          } else {
            if (activeFilters.includes(filter)) {
              newFilters = activeFilters.filter((f) => f !== filter);
            } else {
              newFilters = [...activeFilters, filter];
            }
          }

          const { nodes, edges } = transformToReactFlow(graph, {
            hideTypeDefinitions,
            activeFilters: newFilters
          });

          const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

          set({
            activeFilters: newFilters,
            nodes: layouted.nodes,
            edges: layouted.edges,
            selectedNodeId: null
          });

          if (layoutEngine === 'elk') {
            void get().layoutGraph();
          }
        },

        layoutGraph: async (direction) => {
          const { nodes, edges, layoutEngine, layoutDirection } = get();
          const targetDirection = direction ?? layoutDirection;

          set({ loading: true });

          try {
            const layoutFn = layoutEngine === 'elk' ? applyElkLayout : applyDagreLayout;
            const result = await layoutFn(nodes, edges, { direction: targetDirection });

            set({
              nodes: result.nodes,
              edges: result.edges,
              layoutDirection: targetDirection,
              loading: false
            });
          } catch (error) {
            console.error("Layout failed:", error);
            set({ loading: false });
          }
        },

        selectNode: (nodeId: string | null, shouldOpenInspector = true) => {
          const { graph, nodes, edges, isInspectorOpen } = get();
          if (!graph) return;

          if (!nodeId) {
            set({
              selectedNodeId: null,
              isInspectorOpen: false,
              nodes: nodes.map((n) => ({
                ...n,
                data: { ...n.data, highlighted: false, dimmed: false },
              })),
              edges: edges.map((e) => ({
                ...e,
                style: undefined,
                animated: false,
                zIndex: 0,
              })),
            });
            return;
          }

          const ancestors = new Set<string>();
          const descendants = new Set<string>();

          const bfs = (start: string, direction: 'in' | 'out', result: Set<string>) => {
            if (!graph.hasNode(start)) return;

            const queue = [start];
            const visited = new Set<string>([start]);
            let head = 0;
            while (head < queue.length) {
              const curr = queue[head++];
              if (!curr) continue;

              const neighbors = direction === 'in' ? graph.inNeighbors(curr) : graph.outNeighbors(curr);
              for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                  visited.add(neighbor);
                  result.add(neighbor);
                  queue.push(neighbor);
                }
              }
            }
          };

          bfs(nodeId, 'in', ancestors);
          bfs(nodeId, 'out', descendants);

          const relevantNodes = new Set([...ancestors, ...descendants, nodeId]);

          set({
            selectedNodeId: nodeId,
            isInspectorOpen: shouldOpenInspector || isInspectorOpen,
            nodes: nodes.map((n) => {
              const isHighlighted = relevantNodes.has(n.id);
              return {
                ...n,
                data: {
                  ...n.data,
                  highlighted: isHighlighted,
                  dimmed: !isHighlighted,
                },
              };
            }),
            edges: edges.map((e) => {
              const isSourceRelevant = relevantNodes.has(e.source);
              const isTargetRelevant = relevantNodes.has(e.target);
              const isHighlighted = isSourceRelevant && isTargetRelevant;

              return {
                ...e,
                animated: isHighlighted,
                style: isHighlighted ? HIGHLIGHTED_EDGE_STYLE : DIMMED_EDGE_STYLE,
                zIndex: isHighlighted ? 10 : 0,
              };
            }),
          });
        },

        reparentNode: (nodeId, newParentId, newPosition) => {
          const { nodes, graph } = get();

          const targetNode = nodes.find(n => n.id === nodeId);
          if (!targetNode) return;

          const label = (targetNode.data.label as string) || '';
          const cleanParentId = newParentId?.replace(/\/$/, '');
          const newFullPath = cleanParentId ? `${cleanParentId}/${label}` : label;

          if (graph && graph.hasNode(nodeId)) {
            graph.setNodeAttribute(nodeId, 'fullPath', newFullPath);
          }

          set({
            hasUnsavedChanges: true,
            nodes: nodes.map((n) => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  parentId: newParentId,
                  position: newPosition,
                  extent: newParentId ? undefined : undefined,
                  data: {
                    ...n.data,
                    fullPath: newFullPath,
                  },
                };
              }
              return n;
            }),
          });
        },

        reset: () => {
          set({ nodes: [], edges: [], graph: null, originalGraph: null, hasUnsavedChanges: false, selectedNodeId: null, activeFilters: [], isInspectorOpen: false, rawComplexityMetrics: null, viewMode: 'standard', nodeSize: 'uniform', layoutEngine: 'dagre' });
        },

        resetSimulation: () => {
          const { originalGraph, metricsVersion, layoutEngine } = get();
          if (!originalGraph) return;

          const graph = originalGraph.copy();

          const computedState = computeGraphStateUpdate(graph);

          set({
            ...computedState,
            graph,
          });

          get().calculateMetrics(metricsVersion);

          if (layoutEngine === 'elk') {
            void get().layoutGraph();
          }
        },

        onNodesChange: (changes: NodeChange[]) => {
          set({
            nodes: applyNodeChanges(changes, get().nodes),
          });
        },

        onEdgesChange: (changes: EdgeChange[]) => {
          set({
            edges: applyEdgeChanges(changes, get().edges),
          });
        },
      };
    },
    {
      name: 'dependency-graph-settings',
      storage: createJSONStorage(() => robustStorage),
      partialize: (state) => ({
        layoutEngine: state.layoutEngine,
        viewMode: state.viewMode,
        nodeSize: state.nodeSize,
        hideTypeDefinitions: state.hideTypeDefinitions,
        layoutDirection: state.layoutDirection,
        activeFilters: state.activeFilters,
      }),
    }
  )
);
