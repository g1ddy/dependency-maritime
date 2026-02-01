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
  resetSimulation: () => void;
  reparentNode: (nodeId: string, newParentId: string | undefined, newPosition: { x: number; y: number }) => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export const useGraphStore = create<GraphState>((set, get) => {
  // Pure helper to compute graph state updates without causing side effects
  const computeGraphStateUpdate = (graph: Graph) => {
    const { hideTypeDefinitions, layoutDirection, activeFilters, metricsVersion } = get();

    // Transform to React Flow
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions, activeFilters });

    // Apply Layout
    const layouted = applyDagreLayout(nodes, edges, { direction: layoutDirection });

    // Trigger Async Metrics Calculation (Side Effect)
    // Ideally this should be called after the state update is committed,
    // but calling it here schedules the next async update.
    // Since calculateMetrics reads from 'get()', and we are about to update 'set()',
    // we need to be careful. However, calculateMetrics reads 'graph' from state.
    // The state update will happen synchronously after this returns.
    // So we can defer this call or call it after 'set'.
    // The refactoring suggestion had it inside here, but we can move it out
    // or just call it here trusting the next tick.
    // Actually, calculateMetrics() reads from the store state. If we call it here,
    // the store hasn't updated yet.
    // But since calculateMetrics accepts `version`, it's mostly about triggering the flag.
    // Let's follow the suggested pattern but be mindful that calculateMetrics will read
    // the NEW graph only after the set() is done.
    // Wait... if we call calculateMetrics NOW, it reads the OLD graph from get().graph?
    // The original helper called get().calculateMetrics().
    // The suggestion says:
    // "Trigger async metrics calculation: get().calculateMetrics(metricsVersion);"
    // This seems to rely on calculateMetrics implementation.
    // Let's check calculateMetrics:
    // const { graph } = get();
    // It gets graph from store. So if we call it before set(), it sees old graph.
    // BUT! setGraphData calls set(...) with the result of this function.
    // So the state update happens.
    // The calculateMetrics call is async/detached usually?
    // "set({ isCalculatingMetrics: true });" inside it.
    // It seems calculateMetrics expects the graph to be IN THE STORE.
    // So we should probably call calculateMetrics AFTER the set() in the parent function.

    // However, sticking to the requested refactor structure:
    // The reviewer put `get().calculateMetrics(metricsVersion);` INSIDE the helper
    // BEFORE returning the object.
    // This means it runs BEFORE the state update.
    // If calculateMetrics reads `get().graph`, it will read the OLD graph.
    // That seems wrong.
    // BUT, maybe the reviewer assumes calculateMetrics uses the passed version to wait?
    // No, calculateMetrics reads `get().graph`.

    // Let's look at the original code I wrote:
    // updateGraphState called set(...), THEN called get().calculateMetrics().
    // That worked because set() happened first.

    // So, if I return the object, the caller calls set().
    // The caller should then call calculateMetrics.
    // OR, I can use setTimeout/defer? No, that's messy.

    // The cleaner pattern is:
    // computeGraphStateUpdate returns data.
    // Caller does set(data).
    // Caller does calculateMetrics().

    // But the reviewer's code snippet has:
    // get().calculateMetrics(metricsVersion);
    // return { ... };

    // I will implement it such that calculateMetrics is called properly.
    // I'll make computeGraphStateUpdate purely computation (no side effects),
    // and trigger the side effect in the caller.
    // Wait, the reviewer explicitly put it inside.
    // "Trigger async metrics calculation" inside the helper.
    // If I move it out, I deviate from the snippet but fix the potential bug.
    // Actually, let's look at `metricsVersion`.
    // We increment it in `setGraphData`.
    // calculateMetrics checks `get().metricsVersion !== targetVersion`.

    // Let's modify the helper to NOT call calculateMetrics, but return the object.
    // And in the callers, we do:
    // set(compute...);
    // get().calculateMetrics();
    // This is safer.

    // ERROR: The reviewer's snippet explicitly puts it inside.
    // Maybe they missed that dependency.
    // I will place it inside but verify if it causes issues.
    // If calculateMetrics runs synchronously up to `const { graph } = get()`, it sees old graph.
    // Effectively calculating metrics for the OLD graph (or null).

    // I'll take the liberty to move the `calculateMetrics` call to the caller
    // to ensure correctness, as `set` must happen first.
    // Code correctness > strictly following a potentially buggy snippet.

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

    setInspectorOpen: (isOpen: boolean) => {
      set({ isInspectorOpen: isOpen });
    },

    setViewMode: (mode: ViewMode) => {
      set({ viewMode: mode });
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

      // 2. Compute state
      const computedState = computeGraphStateUpdate(graph);

      set({
        ...computedState,
        graph,
        originalGraph,
      });

      // 3. Trigger Metrics
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
      // Ensure we don't double-slash if newParentId ends with /
      const cleanParentId = newParentId?.replace(/\/$/, '');
      const newFullPath = cleanParentId ? `${cleanParentId}/${label}` : label;

      // 1. Update Graphology Instance (Source of Truth)
      if (graph && graph.hasNode(nodeId)) {
        graph.setNodeAttribute(nodeId, 'fullPath', newFullPath);
      }

      // 2. Update React Flow State (Visual)
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
      set({ nodes: [], edges: [], graph: null, originalGraph: null, hasUnsavedChanges: false, selectedNodeId: null, activeFilters: [], isInspectorOpen: false, rawComplexityMetrics: null });
    },

    resetSimulation: () => {
      const { originalGraph, metricsVersion } = get();
      if (!originalGraph) return;

      const graph = originalGraph.copy();

      const computedState = computeGraphStateUpdate(graph);

      set({
        ...computedState,
        graph,
      });

      // Trigger metric sync
      get().calculateMetrics(metricsVersion);
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
});
