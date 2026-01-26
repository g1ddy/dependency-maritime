import dagre from 'dagre';
import { type Node, type Edge, Position } from '@xyflow/react';

// Default node dimensions if not yet measured
const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 40;

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
}

/**
 * Applies Dagre layout to the React Flow nodes and edges.
 *
 * @param nodes React Flow Nodes
 * @param edges React Flow Edges
 * @param options Layout configuration
 * @returns Tuple of [nodes, edges] with updated positions
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  // 1. Add nodes to Dagre
  nodes.forEach((node) => {
    // In @xyflow/react v12, dimensions are in node.measured.
    // If not yet measured, fall back to defaults or style.
    const width = node.measured?.width ?? node.style?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? node.style?.height ?? DEFAULT_NODE_HEIGHT;

    dagreGraph.setNode(node.id, { width, height });
  });

  // 2. Add edges to Dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 3. Compute Layout
  dagre.layout(dagreGraph);

  // 4. Update Node Positions
  // Dagre returns the center point (x, y). React Flow expects top-left (x, y).
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // We need the dimensions we used for calculation to offset correctly
    const width = node.measured?.width ?? node.style?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? node.style?.height ?? DEFAULT_NODE_HEIGHT;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - (typeof width === 'number' ? width / 2 : 0),
        y: nodeWithPosition.y - (typeof height === 'number' ? height / 2 : 0),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
