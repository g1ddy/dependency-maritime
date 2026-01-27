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
  loading: boolean;

  // Actions
  setGraphData: (data: ICruiseResult) => void;
  layoutGraph: (direction?: 'TB' | 'LR') => void;
  selectNode: (nodeId: string | null) => void;
  reset: () => void;

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

  setGraphData: (data: ICruiseResult) => {
    set({ loading: true });

    // 1. Transform to Graphology
    const graph = createGraphFromCruiseResult(data);

    // 2. Transform to React Flow
    const { nodes, edges } = transformToReactFlow(graph);

    // 3. Apply Initial Layout (Default TB)
    const layouted = applyDagreLayout(nodes, edges, { direction: 'TB' });

    set({
      graph,
      nodes: layouted.nodes,
      edges: layouted.edges,
      selectedNodeId: null, // Reset selection on new data
      loading: false
    });
  },

  layoutGraph: (direction = 'TB') => {
    const { nodes, edges } = get();
    // Re-run layout on existing nodes/edges
    // This allows us to use existing 'measured' dimensions if they exist
    const layouted = applyDagreLayout(nodes, edges, { direction });
    set({ nodes: layouted.nodes, edges: layouted.edges });
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
    set({ nodes: [], edges: [], graph: null, selectedNodeId: null });
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
