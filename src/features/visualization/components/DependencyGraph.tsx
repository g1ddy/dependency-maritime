import { useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, type Node } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import graphData from '../../../../config/dependency-graph.json';
import complexityMetrics from '../../../../config/complexity-metrics.json';
import { CruiseResultSchema } from '@/schema/dependency-cruiser';
import { ComplexityMetricsMapSchema } from '@/schema/complexity-metrics';
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

  const { getIntersectingNodes, getInternalNode, getNode } = useReactFlow();

  const nodeTypes = useMemo(() => ({ appNode: AppNode, groupNode: GroupNode }), []);

  useEffect(() => {
    // Load graph data on mount
    const parsedData = CruiseResultSchema.parse(graphData);
    // Validate metrics data at runtime for robustness
    const parsedMetrics = ComplexityMetricsMapSchema.parse(complexityMetrics);
    setGraphData(parsedData, parsedMetrics);
  }, [setGraphData]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Get the accurate position of the node (after drag)
      // We rely on getInternalNode to ensure we have the latest positionAbsolute
      const internalNode = getInternalNode(node.id) as CustomNode | undefined;
      const publicNode = getNode(node.id) as CustomNode | undefined;

      const targetNode = (internalNode || publicNode || node);
      const nodeAbs = internalNode?.positionAbsolute || publicNode?.positionAbsolute || (node as CustomNode).positionAbsolute;

      // Try to find positionAbsolute in computed if mostly absent (v12 change)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const computedAbs = (internalNode as any)?.computed?.positionAbsolute;
      let finalAbs = nodeAbs || computedAbs;

      // Fallback: Calculate positionAbsolute if missing
      if (!finalAbs && targetNode.position) {
        if (targetNode.parentId) {
          const parent = getInternalNode(targetNode.parentId) || getNode(targetNode.parentId);
          const parentAbs = parent?.positionAbsolute || parent?.position;
          if (parentAbs) {
            finalAbs = {
              x: parentAbs.x + targetNode.position.x,
              y: parentAbs.y + targetNode.position.y,
            };
          }
        } else {
          finalAbs = targetNode.position;
        }
      }

      if (!finalAbs) {
        return;
      }

      // Use finalAbs for the target node for intersection check
      // We need to create a temporary node object with the correct positionAbsolute
      // because getIntersectingNodes uses the passed node's positionAbsolute
      const intersectionTarget = {
        ...targetNode,
        positionAbsolute: finalAbs,
        width: targetNode.width || targetNode.measured?.width || 0,
        height: targetNode.height || targetNode.measured?.height || 0,
      };

      // Find intersecting nodes that are groups using the updated node
      const intersections = getIntersectingNodes(intersectionTarget).filter(
        (n) => n.type === 'groupNode' && n.id !== node.id
      );

      // Sort intersections to find the most specific group (deepest path/longest ID)
      intersections.sort((a, b) => b.id.length - a.id.length);

      const group = intersections[0] as CustomNode | undefined;
      const currentParentId = targetNode.parentId || node.parentId;

      // If dropped on a group
      if (group) {
        // Only update if parent is different
        if (group.id !== currentParentId) {
          // Get the most up-to-date absolute position of the group
          const internalGroup = getInternalNode(group.id) as CustomNode | undefined;
          const publicGroup = getNode(group.id) as CustomNode | undefined;
          let groupAbs = internalGroup?.positionAbsolute || publicGroup?.positionAbsolute || group.positionAbsolute;

          // Fallback for group position
          if (!groupAbs && (internalGroup?.position || publicGroup?.position || group.position)) {
            // Groups are often top-level or nested. We should ideally calculate recursively,
            // but for now, if it's top level, position is absolute.
            // If nested, this fallback might be inaccurate but better than nothing.
            // However, getIntersectingNodes returned it, so it must have had a bbox.
            // Use the position property as a best guess.
            groupAbs = internalGroup?.position || publicGroup?.position || group.position;
          }

          if (groupAbs && finalAbs) {
            const relativeX = finalAbs.x - groupAbs.x;
            const relativeY = finalAbs.y - groupAbs.y;
            reparentNode(node.id, group.id, { x: relativeX, y: relativeY });
          }
        }
      } else {
        // Dropped on canvas (no group)
        if (currentParentId) {
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
