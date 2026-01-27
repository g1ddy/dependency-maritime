import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

const HIGHLIGHTED_EDGE_STYLE = { stroke: '#60a5fa', strokeWidth: 2, opacity: 1 };
const DIMMED_EDGE_STYLE = { stroke: '#334155', strokeWidth: 1, opacity: 0.2 };

interface GraphState {
  // React Flow State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Graphology Instance (Headless Graph)
  // We mark it as potentially undefined until loaded
  graph: Graph | null;

  // Metadata
  rawGraphData: ICruiseResult | null;
  loading: boolean;
  hideTypeDefinitions: boolean;
  layoutDirection: 'TB' | 'LR';
  activeFilters: ModuleCategory[];

  // Actions
  setGraphData: (data: ICruiseResult) => void;
  rehydrateGraph: () => void;
  layoutGraph: (direction?: 'TB' | 'LR') => void;
  selectNode: (nodeId: string | null) => void;
  toggleTypeDefinitions: () => void;
  setFilter: (filter: ModuleCategory | 'all') => void;
  reset: () => void;
  reparentNode: (nodeId: string, newParentId: string | undefined, newPosition: { x: number; y: number }) => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      graph: null,
      rawGraphData: null,
      loading: false,
      hideTypeDefinitions: true,
      layoutDirection: 'TB',
      activeFilters: [],

      setGraphData: (data: ICruiseResult) => {
        const { hideTypeDefinitions, layoutDirection, activeFilters } = get();
        set({ loading: true, rawGraphData: data });

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
      },

      rehydrateGraph: () => {
        const { rawGraphData, graph } = get();
        // If we have raw data but no graph instance (e.g. after reload), rebuild it
        if (rawGraphData && !graph) {
          get().setGraphData(rawGraphData);
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

      reset: () => {
        set({ nodes: [], edges: [], graph: null, selectedNodeId: null, activeFilters: [], rawGraphData: null });
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
    }),
    {
      name: 'dependency-graph-storage',
      partialize: (state) => ({ rawGraphData: state.rawGraphData }), // Only persist raw data
    }
  )
);
      }),
    });
  },

  reparentNode: (nodeId, newParentId, newPosition) => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            parentId: newParentId,
            position: newPosition,
            extent: newParentId ? undefined : undefined,
          };
        }
        return n;
      }),
    });
  },

  reset: () => {
    set({ nodes: [], edges: [], graph: null, selectedNodeId: null, activeFilters: [] });
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
