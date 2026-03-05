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
import { FOLDER_DESCENDANTS_CACHE_KEY } from './logic/graph-utils';
import { applyElkLayout } from './logic/layout-elk';
import { type LayoutOptions } from './logic/layout';
import { type ModuleCategory } from './logic/filters';
import { calculateGraphMetrics, getHealthStatus } from './logic/metrics';
import { type AppNodeData, type GroupNodeData, type ComplexityMetricsMap } from './types';
import LayoutWorker from './logic/layout.worker?worker';
import { type LayoutWorkerResponse } from './logic/layout.worker';

const HIGHLIGHTED_EDGE_STYLE = { stroke: '#60a5fa', strokeWidth: 2, opacity: 1 };
const DIMMED_EDGE_STYLE = { stroke: '#334155', strokeWidth: 1, opacity: 0.2 };
const HIGHLIGHTED_EDGE_Z_INDEX = 10;
const DIMMED_EDGE_Z_INDEX = 0;

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
  isolateModule: boolean;

  // Actions
  setInspectorOpen: (isOpen: boolean) => void;
  setGraphData: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => void;
  calculateMetrics: (version?: number) => void;
  layoutGraph: (direction?: 'TB' | 'LR') => Promise<void>;
  setLayoutEngine: (engine: LayoutEngine) => void;
  selectNode: (nodeId: string | null, shouldOpenInspector?: boolean) => void;
  toggleTypeDefinitions: () => void;
  toggleIsolateModule: () => void;
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

// In-memory fallback storage
const memoryStorage = new Map<string, string>();

const robustStorage = {
  getItem: (name: string): string | null => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      try {
        return localStorage.getItem(name);
      } catch (error) {
        // Fallback if access is denied or fails
        console.warn('Failed to get item from localStorage, falling back to memory storage:', error);
      }
    }
    return memoryStorage.get(name) || null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      try {
        localStorage.setItem(name, value);
        return;
      } catch (error) {
        // Fallback
        console.warn('Failed to set item in localStorage, falling back to memory storage:', error);
      }
    }
    memoryStorage.set(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      try {
        localStorage.removeItem(name);
        return;
      } catch (error) {
        // Fallback
        console.warn('Failed to remove item from localStorage, falling back to memory storage:', error);
      }
    }
    memoryStorage.delete(name);
  },
};

// --- Worker Management ---
let currentWorker: Worker | null = null;
let currentReject: ((reason?: Error) => void) | null = null;
let isWorkerBusy = false;

function getWorker() {
  if (!currentWorker) {
    currentWorker = new LayoutWorker();
  }
  return currentWorker;
}

function terminateWorker() {
  if (currentReject) {
    currentReject(new Error('Layout cancelled'));
    currentReject = null;
  }
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
  }
  isWorkerBusy = false;
}

const runDagreLayout = (nodes: Node[], edges: Edge[], options: LayoutOptions) => {
  // If the worker is busy, we must terminate it to prioritize the new request.
  // JS Workers process messages sequentially, so a new message would wait for the old one.
  if (isWorkerBusy) {
    terminateWorker();
  }

  const worker = getWorker();
  isWorkerBusy = true;

  return new Promise<{ nodes: Node[], edges: Edge[] }>((resolve, reject) => {
      currentReject = reject;

      // Safety timeout to prevent infinite hanging
      const timeoutId = setTimeout(() => {
        if (currentReject === reject) {
          console.warn('Worker layout timed out, falling back to original nodes');
          terminateWorker(); // Kill the stuck worker
          // Fallback: resolve with original nodes to unblock UI
          resolve({ nodes, edges });
        }
      }, 60000);

      // One-time listener
      worker.onmessage = (event: MessageEvent<LayoutWorkerResponse>) => {
          // Only resolve if this matches the current request (though worker is single-threaded)
          if (currentReject === reject) {
            clearTimeout(timeoutId);
            currentReject = null;
            isWorkerBusy = false;
            resolve(event.data);
          }
      };
      worker.onerror = (err) => {
        if (currentReject === reject) {
          clearTimeout(timeoutId);
          isWorkerBusy = false;
          currentReject = null;
          reject(new Error(err.message || 'Worker layout failed'));
        }
      };
      worker.postMessage({ nodes, edges, options });
  });
};


export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => {
      // Helper to compute unlayouted graph state
      const computeGraphState = (graph: Graph) => {
        const { hideTypeDefinitions, activeFilters, isolateModule } = get();

        // Transform to React Flow
        const { nodes, edges, visibleIds } = transformToReactFlow(graph, { hideTypeDefinitions, activeFilters, isolateModule });

        return {
          state: {
            nodes,
            edges,
            selectedNodeId: null,
            loading: true, // Always loading until layout finishes
            hasUnsavedChanges: false
          },
          visibleIds
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
        isolateModule: false,

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

          // 2. Compute initial state (Unlayouted)
          const { state: computedState } = computeGraphState(graph);

          set({
            ...computedState,
            graph,
            originalGraph,
          });

          // 3. Trigger Layout (Async)
          void get().layoutGraph().then(() => {
             // 4. Trigger Metrics only after layout/graph is set
             get().calculateMetrics(newVersion);
          });
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
          const { graph, hideTypeDefinitions, selectedNodeId } = get();
          if (!graph) return;

          const newValue = !hideTypeDefinitions;

          // Update filter setting immediately
          set({ hideTypeDefinitions: newValue });

          // Re-transform (Unlayouted)
          const { state, visibleIds } = computeGraphState(graph);
          set(state);

          // Trigger Layout
          void get().layoutGraph().then(() => {
              if (selectedNodeId && visibleIds.has(selectedNodeId)) {
                get().selectNode(selectedNodeId);
              }
          });
        },

        toggleIsolateModule: () => {
          const { graph, isolateModule, hideTypeDefinitions, activeFilters, selectedNodeId } = get();
          if (!graph) return;

          const newValue = !isolateModule;

          // Re-transform
          const { nodes, edges, visibleIds } = transformToReactFlow(graph, {
            hideTypeDefinitions,
            activeFilters,
            isolateModule: newValue
          });

          set({
            isolateModule: newValue,
            nodes,
            edges,
            selectedNodeId: null,
            loading: true,
          });

          void get().layoutGraph().then(() => {
            if (selectedNodeId && visibleIds.has(selectedNodeId)) {
              get().selectNode(selectedNodeId);
            }
          });
        },

        setFilter: (filter: ModuleCategory | 'all') => {
          const { graph, activeFilters } = get();
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

          set({ activeFilters: newFilters, selectedNodeId: null });

          const state = computeGraphState(graph);
          set(state);

          void get().layoutGraph();
        },

        layoutGraph: async (direction) => {
          const { nodes, edges, layoutEngine, layoutDirection } = get();
          const targetDirection = direction ?? layoutDirection;

          set({ loading: true });

          try {
            let result: { nodes: Node[]; edges: Edge[] };

            if (layoutEngine === 'elk') {
                result = await applyElkLayout(nodes, edges, { direction: targetDirection });
            } else {
                result = await runDagreLayout(nodes, edges, { direction: targetDirection });
            }

            set({
              nodes: result.nodes,
              edges: result.edges,
              layoutDirection: targetDirection,
              loading: false
            });
          } catch (error) {
            if (error instanceof Error && error.message === 'Layout cancelled') {
              // Ignore cancellation, likely superseded by new layout request
              return;
            }
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
              const isDimmed = !isHighlighted;

              // Optimization: Return existing object if state matches
              // This prevents unnecessary re-renders in React Flow
              if (n.data.highlighted === isHighlighted && n.data.dimmed === isDimmed) {
                return n;
              }

              return {
                ...n,
                data: {
                  ...n.data,
                  highlighted: isHighlighted,
                  dimmed: isDimmed,
                },
              };
            }),
            edges: edges.map((e) => {
              const isSourceRelevant = relevantNodes.has(e.source);
              const isTargetRelevant = relevantNodes.has(e.target);
              const isHighlighted = isSourceRelevant && isTargetRelevant;
              const targetStyle = isHighlighted ? HIGHLIGHTED_EDGE_STYLE : DIMMED_EDGE_STYLE;
              const targetZIndex = isHighlighted ? HIGHLIGHTED_EDGE_Z_INDEX : DIMMED_EDGE_Z_INDEX;

              // Optimization: Return existing object if state matches
              if (
                e.animated === isHighlighted &&
                e.style === targetStyle &&
                e.zIndex === targetZIndex
              ) {
                return e;
              }

              return {
                ...e,
                animated: isHighlighted,
                style: targetStyle,
                zIndex: targetZIndex,
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
            // Clear cached descendants map as hierarchy has changed
            graph.removeAttribute(FOLDER_DESCENDANTS_CACHE_KEY);
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
          set({ nodes: [], edges: [], graph: null, originalGraph: null, hasUnsavedChanges: false, selectedNodeId: null, activeFilters: [], isInspectorOpen: false, rawComplexityMetrics: null, viewMode: 'standard', nodeSize: 'uniform', layoutEngine: 'dagre', isolateModule: false });
        },

        resetSimulation: () => {
          const { originalGraph, metricsVersion } = get();
          if (!originalGraph) return;

          const graph = originalGraph.copy();

          // Unlayouted
          const { state: computedState } = computeGraphState(graph);

          set({
            ...computedState,
            graph,
          });

          // Async layout
          void get().layoutGraph().then(() => {
              get().calculateMetrics(metricsVersion);
          });
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
