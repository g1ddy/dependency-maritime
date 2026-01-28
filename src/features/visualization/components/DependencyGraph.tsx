import { useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, type Node } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import graphData from '../../../../sample-data/dependency-graph.json';
import { CruiseResultSchema } from '@/schema/dependency-cruiser';
import { AppNode } from './AppNode';
import { GroupNode } from './GroupNode';
import { type CustomNode, type AppNodeData } from '../types';

const MINI_MAP_NODE_COLORS = {
  EXTERNAL: '#f59e0b', // amber-500
  TSX: '#60a5fa', // blue-400
  TS: '#4ade80', // green-400
  DEFAULT: '#94a3b8', // slate-400
} as const;

// Define MiniMap node color logic outside component to prevent re-renders
const miniMapNodeColor = (node: Node<AppNodeData>) => {
  const label = node.data.label || '';
  const isExternal = !!node.data.external;

  if (isExternal) return MINI_MAP_NODE_COLORS.EXTERNAL;
  if (label.endsWith('.tsx')) return MINI_MAP_NODE_COLORS.TSX;
  if (label.endsWith('.ts')) return MINI_MAP_NODE_COLORS.TS;
  return MINI_MAP_NODE_COLORS.DEFAULT;
};

export function DependencyGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setGraphData,
    selectNode,
    reparentNode,
  } = useGraphStore();

  const { getIntersectingNodes, getInternalNode } = useReactFlow();

  const nodeTypes = useMemo(() => ({ appNode: AppNode, groupNode: GroupNode }), []);

  useEffect(() => {
    // Load graph data on mount
    const parsedData = CruiseResultSchema.parse(graphData);
    setGraphData(parsedData);
  }, [setGraphData]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      type Position = { x: number; y: number };

      // Find intersecting nodes that are groups
      const intersections = getIntersectingNodes(node).filter(
        (n) => n.type === 'groupNode' && n.id !== node.id
      );
      const group = intersections[0] as CustomNode | undefined;

      // Get the accurate position of the node (after drag)
      // We rely on getInternalNode to ensure we have the latest positionAbsolute
      // falling back to the passed node's positionAbsolute
      // We use 'any' casting here because getInternalNode returns a type that ESLint finds ambiguous
      // or 'error-typed' in this context, but we know it has positionAbsolute at runtime.
      const internalNode = getInternalNode(node.id) as { positionAbsolute?: Position } | undefined;
      const nodeAbs = internalNode?.positionAbsolute || (node as CustomNode).positionAbsolute;

      // If dropped on a group
      if (group) {
        // Only update if parent is different
        if (group.id !== node.parentId) {
          // Get the most up-to-date absolute position of the group
          const internalGroup = getInternalNode(group.id) as { positionAbsolute?: Position } | undefined;
          const groupAbs = internalGroup?.positionAbsolute || group.positionAbsolute;

          if (nodeAbs && groupAbs) {
            const relativeX = nodeAbs.x - groupAbs.x;
            const relativeY = nodeAbs.y - groupAbs.y;
            reparentNode(node.id, group.id, { x: relativeX, y: relativeY });
          }
        }
      } else {
        // Dropped on canvas (no group)
        if (node.parentId) {
          if (nodeAbs) {
            reparentNode(node.id, undefined, {
              x: nodeAbs.x,
              y: nodeAbs.y,
            });
          }
        }
      }
    },
    [getIntersectingNodes, reparentNode, getInternalNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={miniMapNodeColor}
          nodeStrokeColor="transparent"
          nodeBorderRadius={2}
        />
      </ReactFlow>
    </div>
  );
}
