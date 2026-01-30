import { useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, type Node } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import graphData from '../../../../config/dependency-graph.json';
import { CruiseResultSchema } from '@/schema/dependency-cruiser';
import { AppNode } from './AppNode';
import { GroupNode } from './GroupNode';
import { type CustomNode, type AppNodeData } from '../types';
import { isNodeCenterInside } from '../logic/geometry';

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
  const disableAnimations = import.meta.env.VITE_DISABLE_ANIMATIONS === 'true';
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
      // Get the accurate position of the node (after drag)
      const internalNode = getInternalNode(node.id);

      // If we can't find the internal node, we can't reliably calculate geometry
      if (!internalNode) return;

      const nodeAbs = internalNode.positionAbsolute;
      if (!nodeAbs) return;

      // Find intersecting nodes that are groups
      const intersections = getIntersectingNodes(node).filter(
        (n) => n.type === 'groupNode' && n.id !== node.id
      );

      // Filter intersections based on geometry (Center Inside)
      // We need to fetch the internal node for each group to get its dimensions/positionAbsolute
      const validGroups = intersections.filter((group) => {
        const internalGroup = getInternalNode(group.id);
        if (!internalGroup) return false;
        return isNodeCenterInside(internalNode, internalGroup);
      });

      // Sort intersections to find the most specific group (deepest path/longest ID)
      validGroups.sort((a, b) => b.id.length - a.id.length);

      const targetGroup = validGroups[0] as CustomNode | undefined;

      // If dropped on a valid group
      if (targetGroup) {
        // Only update if parent is different
        // We trigger this even if it's the SAME parent to correct the relative position
        // if the store logic requires it, but usually we care about reparenting.
        // However, if we drag inside the same parent, React Flow handles position updates.
        // We only need to call reparentNode if the parent CHANGED.
        if (targetGroup.id !== node.parentId) {
          const internalGroup = getInternalNode(targetGroup.id) as CustomNode | undefined;
          const groupAbs = internalGroup?.positionAbsolute || targetGroup.positionAbsolute;

          if (groupAbs) {
            const relativeX = nodeAbs.x - groupAbs.x;
            const relativeY = nodeAbs.y - groupAbs.y;
            reparentNode(node.id, targetGroup.id, { x: relativeX, y: relativeY });
          }
        }
      } else {
        // Dropped on canvas (no valid group found)
        // If the node currently has a parent, it means we dragged it OUT.
        if (node.parentId) {
          reparentNode(node.id, undefined, {
            x: nodeAbs.x,
            y: nodeAbs.y,
          });
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
        fitViewOptions={disableAnimations ? { duration: 0 } : undefined}
        minZoom={0.1}
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
