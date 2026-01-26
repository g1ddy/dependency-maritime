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

interface GraphState {
  // React Flow State
  nodes: Node[];
  edges: Edge[];

  // Graphology Instance (Headless Graph)
  // We mark it as potentially undefined until loaded
  graph: Graph | null;

  // Metadata
  loading: boolean;

  // Actions
  setGraphData: (data: ICruiseResult) => void;
  layoutGraph: (direction?: 'TB' | 'LR') => void;
  reset: () => void;

  // React Flow Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
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

  reset: () => {
    set({ nodes: [], edges: [], graph: null });
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
