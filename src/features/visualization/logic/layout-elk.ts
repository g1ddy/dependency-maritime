import ELK from 'elkjs/lib/elk.bundled.js';
import { type ElkNode, type ElkExtendedEdge } from 'elkjs';
import { type Node, type Edge, Position } from '@xyflow/react';
import { getNodeDimensions, type LayoutOptions } from './layout';

const elk = new ELK();

/**
 * Applies ELK layout to the React Flow nodes and edges asynchronously.
 * Uses the 'layered' algorithm by default.
 */
export async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const { direction = 'TB' } = options;
  const isHorizontal = direction === 'LR';

  // Map to store ElkNodes by ID for hierarchy building
  const elkNodesMap = new Map<string, ElkNode>();

  // 1. Create ElkNodes
  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node, options);
    elkNodesMap.set(node.id, {
      id: node.id,
      width,
      height,
      children: [],
      edges: [],
      layoutOptions: {
        // Minimal padding for groups to contain children
        'elk.padding': '[top=40,left=20,bottom=20,right=20]',
      }
    });
  });

  // 2. Build Hierarchy
  const rootChildren: ElkNode[] = [];

  nodes.forEach((node) => {
    const elkNode = elkNodesMap.get(node.id)!;
    if (node.parentId && elkNodesMap.has(node.parentId)) {
      const parent = elkNodesMap.get(node.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(elkNode);
    } else {
      rootChildren.push(elkNode);
    }
  });

  // 3. Create ElkEdges
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  // 4. Construct Root Graph
  const rootGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': isHorizontal ? 'RIGHT' : 'DOWN',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.edgeNode': '30',
      // Ensure hierarchy is handled
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children: rootChildren,
    edges: elkEdges,
  };

  // 5. Run Layout
  try {
    const layoutedGraph = await elk.layout(rootGraph);

    // 6. Map positions back to React Flow nodes
    // ELK returns relative positions for children, which matches React Flow's expectation.
    // We need to flatten the results to update our flat nodes array.

    const nextNodes = nodes.map((originalNode) => {
      const elkNode = findElkNode(layoutedGraph, originalNode.id);

      if (!elkNode) {
        return originalNode;
      }

      // Update position
      const x = elkNode.x || 0;
      const y = elkNode.y || 0;

      // Update dimensions if ELK resized them (e.g. groups)
      const width = elkNode.width;
      const height = elkNode.height;

      // Update style for group nodes
      const newStyle = { ...originalNode.style };
      if (originalNode.type === 'groupNode' && width && height) {
        newStyle.width = width;
        newStyle.height = height;
      }

      return {
        ...originalNode,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x, y },
        style: newStyle,
      };
    });

    return { nodes: nextNodes, edges };

  } catch (error) {
    console.error('ELK Layout failed:', error);
    // Fallback: return original
    return { nodes, edges };
  }
}

// Helper to find a node in the ELK tree
function findElkNode(root: ElkNode, id: string): ElkNode | undefined {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findElkNode(child, id);
      if (found) return found;
    }
  }
  return undefined;
}
