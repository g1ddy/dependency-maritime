import { create } from 'zustand';
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
import { type ModuleCategory } from './logic/filters';
import { calculateGraphMetrics, getHealthStatus } from './logic/metrics';
import { type AppNodeData, type GroupNodeData, type ComplexityMetricsMap } from './types';

const HIGHLIGHTED_EDGE_STYLE = { stroke: '#60a5fa', strokeWidth: 2, opacity: 1 };
const DIMMED_EDGE_STYLE = { stroke: '#334155', strokeWidth: 1, opacity: 0.2 };

export type ViewMode = 'standard' | 'instability' | 'centrality';

interface GraphState {
  // React Flow State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Graphology Instance (Headless Graph)
  // We mark it as potentially undefined until loaded
  graph: Graph | null;

  // Metadata
  loading: boolean;
  isCalculatingMetrics: boolean;
  metricsVersion: number;
  hideTypeDefinitions: boolean;
  layoutDirection: 'TB' | 'LR';
  activeFilters: ModuleCategory[];
  isInspectorOpen: boolean;
  rawComplexityMetrics: ComplexityMetricsMap | null;
  viewMode: ViewMode;

  // Actions
  setInspectorOpen: (isOpen: boolean) => void;
  setGraphData: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => void;
  calculateMetrics: (version?: number) => void;
  layoutGraph: (direction?: 'TB' | 'LR') => void;
  selectNode: (nodeId: string | null) => void;
  toggleTypeDefinitions: () => void;
  setFilter: (filter: ModuleCategory | 'all') => void;
  setViewMode: (mode: ViewMode) => void;
  reset: () => void;
  reparentNode: (nodeId: string, newParentId: string | undefined, newPosition: { x: number; y: number }) => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  graph: null,
  loading: false,
  isCalculatingMetrics: false,
  metricsVersion: 0,
  hideTypeDefinitions: true,
  layoutDirection: 'TB',
  activeFilters: [],
  isInspectorOpen: false,
  rawComplexityMetrics: null,
  viewMode: 'standard',

  setInspectorOpen: (isOpen: boolean) => {
    set({ isInspectorOpen: isOpen });
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setGraphData: (data: ICruiseResult, complexityMetrics?: ComplexityMetricsMap) => {
    const { hideTypeDefinitions, layoutDirection, activeFilters } = get();
    set((state) => ({
      loading: true,
      metricsVersion: state.metricsVersion + 1,
      rawComplexityMetrics: complexityMetrics || null
    }));
    const newVersion = get().metricsVersion;

    // 1. Transform to Graphology
    const graph = createGraphFromCruiseResult(data);

    // 2. Transform to React Flow
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions, activeFilters });

    // 3. Apply Initial Layout
    const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

    set({
      graph,
      nodes: layouted.nodes,
      edges: layouted.edges,
      selectedNodeId: null, // Reset selection on new data
      loading: false
    });

    // 4. Trigger Async Metrics Calculation
    get().calculateMetrics(newVersion);
  },

  calculateMetrics: (version?: number) => {
    const targetVersion = version ?? get().metricsVersion;
    const { graph, rawComplexityMetrics } = get();
    if (!graph) return;

    // Early exit if a newer calculation has already started
    if (get().metricsVersion !== targetVersion) return;

    set({ isCalculatingMetrics: true });

    try {
      const folderMetrics = calculateGraphMetrics(graph, rawComplexityMetrics);

      // Abort if a newer calculation has started while we were awaiting
      if (get().metricsVersion !== targetVersion) return;

      // Sync results back to React Flow nodes
      // We iterate over the existing RF nodes (getting the latest state)
      // and update their data from the potentially mutated Graphology graph attributes.
      const currentNodes = get().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (graph.hasNode(node.id)) {
          // This is a file node
          // Cast attributes to AppNodeData partial since Graphology returns Record<string, any>
          const attributes = graph.getNodeAttributes(node.id) as Partial<AppNodeData>;
          return {
            ...node,
            data: {
              ...node.data,
              // Update specific fields we expect to change
              metrics: attributes.metrics,
              healthStatus: attributes.healthStatus,
              debugColor: attributes.debugColor
            } as AppNodeData
          };
        } else if (node.type === 'groupNode' && folderMetrics[node.id]) {
          // This is a group node with calculated metrics
          const metrics = folderMetrics[node.id];

          // Determine health status based on compound score
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
      // Only reset loading state if this is still the current calculation
      if (get().metricsVersion === targetVersion) {
        set({ isCalculatingMetrics: false });
      }
    }
  },

  toggleTypeDefinitions: () => {
    const { graph, hideTypeDefinitions, selectedNodeId, layoutDirection, activeFilters } = get();
    if (!graph) return;

    const newValue = !hideTypeDefinitions;

    // Re-transform with new filter
    const { nodes, edges } = transformToReactFlow(graph, {
      hideTypeDefinitions: newValue,
      activeFilters
    });

    // Re-layout using preserved direction
    const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

    set({
      hideTypeDefinitions: newValue,
      nodes: layouted.nodes,
      edges: layouted.edges,
    });

    // Re-apply selection highlighting if a node was selected
    if (selectedNodeId) {
      get().selectNode(selectedNodeId);
    }
  },

  setFilter: (filter: ModuleCategory | 'all') => {
    const { graph, hideTypeDefinitions, layoutDirection, activeFilters } = get();
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

    // Re-transform with new filter
    const { nodes, edges } = transformToReactFlow(graph, {
      hideTypeDefinitions,
      activeFilters: newFilters
    });

    // Re-layout
    const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

    set({
      activeFilters: newFilters,
      nodes: layouted.nodes,
      edges: layouted.edges,
      selectedNodeId: null // Reset selection as the node might be hidden
    });

    // Optional: try to preserve selection if visible?
    // For now, simpler to reset.
  },

  layoutGraph: (direction = 'TB') => {
    const { nodes, edges } = get();
    // Re-run layout on existing nodes/edges
    // This allows us to use existing 'measured' dimensions if they exist
    const layouted = applyDagreLayout(nodes, edges, { direction });
    set({
      nodes: layouted.nodes,
      edges: layouted.edges,
      layoutDirection: direction
    });
  },

  selectNode: (nodeId: string | null) => {
    const { graph, nodes, edges } = get();
    if (!graph) return;

    if (!nodeId) {
      // Reset visual state
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

    // Traversal for Ancestors (Inbound) and Descendants (Outbound)
    const ancestors = new Set<string>();
    const descendants = new Set<string>();

    // Helper for BFS
    const bfs = (start: string, direction: 'in' | 'out', result: Set<string>) => {
      // If the node doesn't exist in the graph (e.g. it's a folder/group node),
      // we can't traverse neighbors.
      if (!graph.hasNode(start)) return;

      const queue = [start];
      const visited = new Set<string>([start]);
      let head = 0;
      while (head < queue.length) {
        // Safe access because we check head < queue.length
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
      isInspectorOpen: true,
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

    // Calculate new fullPath logic outside map to reuse for graph update
    // We need to find the node first to get its label
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const label = (targetNode.data.label as string) || '';
    const newFullPath = newParentId ? `${newParentId}/${label}` : label;

    // 1. Update Graphology Instance (Source of Truth)
    if (graph && graph.hasNode(nodeId)) {
      graph.setNodeAttribute(nodeId, 'fullPath', newFullPath);
    }

    // 2. Update React Flow State (Visual)
    set({
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
    set({ nodes: [], edges: [], graph: null, selectedNodeId: null, activeFilters: [], isInspectorOpen: false, rawComplexityMetrics: null });
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
}));
