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
 * Helper to determine node dimensions with proper fallback precedence.
 */
function getNodeDimensions(node: Node, options: LayoutOptions) {
  // 1. Measured dimensions (from React Flow)
  // 2. Explicit style dimensions
  // 3. User-provided options
  // 4. Hardcoded defaults
  const width = node.measured?.width
    ?? (typeof node.style?.width === 'number' ? node.style.width : undefined)
    ?? options.nodeWidth
    ?? DEFAULT_NODE_WIDTH;

  const height = node.measured?.height
    ?? (typeof node.style?.height === 'number' ? node.style.height : undefined)
    ?? options.nodeHeight
    ?? DEFAULT_NODE_HEIGHT;

  return { width, height };
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
    const { width, height } = getNodeDimensions(node, options);
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

    // Use the dimensions Dagre used for the calculation to ensure correct centering
    const { width, height } = nodeWithPosition;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
