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

const MINI_MAP_NODE_COLORS = {
  EXTERNAL: '#f59e0b', // amber-500
  TSX: '#60a5fa', // blue-400
  TS: '#4ade80', // green-400
  DEFAULT: '#94a3b8', // slate-400
} as const;

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

  const { getIntersectingNodes } = useReactFlow();

  const nodeTypes = useMemo(() => ({ appNode: AppNode, groupNode: GroupNode }), []);

  useEffect(() => {
    // Load graph data on mount
    const parsedData = CruiseResultSchema.parse(graphData);
    setGraphData(parsedData);
  }, [setGraphData]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Find intersecting nodes that are groups
      const intersections = getIntersectingNodes(node).filter(
        (n) => n.type === 'groupNode' && n.id !== node.id
      );
      const group = intersections[0];

      // If dropped on a group
      if (group) {
        // Only update if parent is different
        if (group.id !== node.parentId) {
          // Calculate relative position based on absolute positions
          // positionAbsolute is present at runtime but potentially missing in Node type definition
          const nodeAbs = (node as Node & { positionAbsolute?: { x: number; y: number } }).positionAbsolute;
          const groupAbs = (group as Node & { positionAbsolute?: { x: number; y: number } }).positionAbsolute;

          if (nodeAbs && groupAbs) {
            const relativeX = nodeAbs.x - groupAbs.x;
            const relativeY = nodeAbs.y - groupAbs.y;
            reparentNode(node.id, group.id, { x: relativeX, y: relativeY });
          }
        }
      } else {
        // Dropped on canvas (no group)
        if (node.parentId) {
          const nodeAbs = (node as Node & { positionAbsolute?: { x: number; y: number } }).positionAbsolute;
          if (nodeAbs) {
            reparentNode(node.id, undefined, {
              x: nodeAbs.x,
              y: nodeAbs.y,
            });
          }
        }
      }
    },
    [getIntersectingNodes, reparentNode]
  );

  // Define MiniMap node color logic
  const miniMapNodeColor = (node: { data: { label?: unknown; external?: unknown } }) => {
    const label = (node.data.label as string) || '';
    const isExternal = !!node.data.external;

    if (isExternal) return MINI_MAP_NODE_COLORS.EXTERNAL;
    if (label.endsWith('.tsx')) return MINI_MAP_NODE_COLORS.TSX;
    if (label.endsWith('.ts')) return MINI_MAP_NODE_COLORS.TS;
    return MINI_MAP_NODE_COLORS.DEFAULT;
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
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
