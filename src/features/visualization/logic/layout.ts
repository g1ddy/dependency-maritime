import dagre from 'dagre';
import { type Node, type Edge } from '@xyflow/react';

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
export function getNodeDimensions(node: Node, options: LayoutOptions) {
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

  // Enable compound graph support
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  // 1. Add nodes to Dagre
  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node, options);
    // For cluster nodes (groups), dimensions set here act as minimum dimensions
    dagreGraph.setNode(node.id, { width, height });

    if (node.parentId) {
      dagreGraph.setParent(node.id, node.parentId);
    }
  });

  // 2. Add edges to Dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 3. Compute Layout
  dagre.layout(dagreGraph);

  // 4. Update Node Positions
  // Capture all absolute top-left positions first
  const absolutePositions = new Map<string, { x: number; y: number }>();

  nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      // Dagre returns center coordinates, convert to top-left
      const x = nodeWithPosition.x - nodeWithPosition.width / 2;
      const y = nodeWithPosition.y - nodeWithPosition.height / 2;
      absolutePositions.set(node.id, { x, y });
  });

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Use the dimensions Dagre used for the calculation to ensure correct centering
    const { width, height } = nodeWithPosition;

    let x = nodeWithPosition.x - width / 2;
    let y = nodeWithPosition.y - height / 2;

    // Convert to relative position if parent exists
    if (node.parentId) {
        const parentPos = absolutePositions.get(node.parentId);
        if (parentPos) {
            x = x - parentPos.x;
            y = y - parentPos.y;
        } else {
            // Check if we are really missing the parent in the nodes list
            console.warn(`Layout: Missing parent position for ${node.id} (parent: ${node.parentId}). Node might render displaced.`);
        }
    }

    // Update style/dimensions for group nodes so they render correctly sized
    // We add a padding buffer to ensure children are visually contained even if font rendering differs
    const GROUP_PADDING_BUFFER = 20;
    const newStyle = { ...(node.style || {}) };

    if (node.type === 'groupNode') {
        newStyle.width = width + GROUP_PADDING_BUFFER;
        newStyle.height = height + GROUP_PADDING_BUFFER;
    }

    const targetPosition = isHorizontal ? 'left' : 'top';
    const sourcePosition = isHorizontal ? 'right' : 'bottom';

    return {
      ...node,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      targetPosition: targetPosition as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      sourcePosition: sourcePosition as any,
      position: {
        x,
        y,
      },
      style: newStyle,
    };
  });

  return { nodes: layoutedNodes, edges };
}
