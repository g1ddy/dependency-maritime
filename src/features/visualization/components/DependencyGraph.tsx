import { useEffect, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow, type Node } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import graphData from '../../../../config/dependency-graph.json';
import complexityMetrics from '../../../../config/complexity-metrics.json';
import { CruiseResultSchema, type ICruiseResult } from '@/schema/dependency-cruiser';
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
  const disableAnimations = import.meta.env.VITE_DISABLE_ANIMATIONS === 'true' || new URLSearchParams(window.location.search).get('disableAnimations') === 'true';
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const loading = useGraphStore((s) => s.loading);

  const {
    onNodesChange,
    onEdgesChange,
    setGraphData,
    selectNode,
    reparentNode,
  } = useGraphStore(useShallow((s) => ({
    onNodesChange: s.onNodesChange,
    onEdgesChange: s.onEdgesChange,
    setGraphData: s.setGraphData,
    selectNode: s.selectNode,
    reparentNode: s.reparentNode,
  })));

  const { getIntersectingNodes, getInternalNode, getNode, fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ appNode: AppNode, groupNode: GroupNode }), []);

  useEffect(() => {
    if (disableAnimations) {
      document.body.classList.add('disable-animations');
    } else {
      document.body.classList.remove('disable-animations');
    }
    return () => {
      document.body.classList.remove('disable-animations');
    };
  }, [disableAnimations]);

  useEffect(() => {
    // Load graph data on mount
    const parsedData = CruiseResultSchema.parse(graphData) as ICruiseResult;
    // Validate metrics data at runtime for robustness
    const parsedMetrics = ComplexityMetricsMapSchema.parse(complexityMetrics);
    setGraphData(parsedData, parsedMetrics);
  }, [setGraphData]);

  // Re-fit view when layout finishes
  useEffect(() => {
    if (!loading && nodes.length > 0) {
      // Small delay to allow React Flow to render updated positions
      const t = setTimeout(() => {
        window.requestAnimationFrame(() => {
            void fitView({ duration: disableAnimations ? 0 : 400, padding: 0.2 });
        });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [loading, nodes.length, fitView, disableAnimations]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Recursive helper to get absolute position
      const getAbsolutePosition = (nodeId: string): { x: number; y: number } | undefined => {
        const internalNode = getInternalNode(nodeId);
        const publicNode = getNode(nodeId);
        const target = internalNode || publicNode;

        if (!target) return undefined;

        // Try direct absolute position
        type XYFlowNodeWithComputed = Node & {
          positionAbsolute?: { x: number; y: number };
          computed?: { positionAbsolute?: { x: number; y: number } };
        };

        const internal = internalNode as XYFlowNodeWithComputed | undefined;
        const publicN = publicNode as XYFlowNodeWithComputed | undefined;

        let absPos = internal?.positionAbsolute || publicN?.positionAbsolute || internal?.computed?.positionAbsolute;

        // Ensure shape
        const safeAbs = absPos as { x: unknown; y: unknown } | undefined;
        if (!safeAbs || typeof safeAbs.x !== 'number' || typeof safeAbs.y !== 'number') {
           absPos = undefined;
        }

        if (absPos) return absPos as { x: number; y: number };

        // Fallback: Calculate recursively using parent
        if (target.parentId) {
          const parentAbs = getAbsolutePosition(target.parentId);
          if (parentAbs && target.position) {
            return {
              x: parentAbs.x + target.position.x,
              y: parentAbs.y + target.position.y
            };
          }
        } else if (target.position) {
          // No parent, so position is absolute
          return target.position;
        }

        return undefined;
      };

      const finalAbs = getAbsolutePosition(node.id);

      if (!finalAbs) {
        return;
      }

      // Use finalAbs for the target node for intersection check
      // We need to create a temporary node object with the correct positionAbsolute
      // because getIntersectingNodes uses the passed node's positionAbsolute
      const intersectionTarget = {
        ...node,
        positionAbsolute: finalAbs,
        width: node.width || node.measured?.width || 0,
        height: node.height || node.measured?.height || 0,
      };

      // Find intersecting nodes that are groups using the updated node
      const intersections = getIntersectingNodes(intersectionTarget).filter(
        (n) => n.type === 'groupNode' && n.id !== node.id
      );

      // Sort intersections to find the most specific group (deepest path/longest ID)
      intersections.sort((a, b) => b.id.length - a.id.length);

      const group = intersections[0] as CustomNode | undefined;
      const currentParentId = node.parentId;

      // If dropped on a group
      if (group) {
        // Only update if parent is different
        if (group.id !== currentParentId) {
          const groupAbs = getAbsolutePosition(group.id);

          if (groupAbs) {
            const relativeX = finalAbs.x - groupAbs.x;
            const relativeY = finalAbs.y - groupAbs.y;
            reparentNode(node.id, group.id, { x: relativeX, y: relativeY });
          }
        }
      } else {
        // Dropped on canvas (no group)
        if (currentParentId) {
          reparentNode(node.id, undefined, { x: finalAbs.x, y: finalAbs.y });
        }
      }
    },
    [getIntersectingNodes, reparentNode, getInternalNode, getNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Only auto-open inspector on desktop (>= 768px)
      const isDesktop = window.matchMedia?.('(min-width: 768px)').matches ?? true;
      selectNode(node.id, isDesktop);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // data-layout-ready is used by E2E tests to verify layout completion
  return (
    <div
        className="absolute inset-0 w-full h-full"
        data-layout-ready={!loading && nodes.length > 0}
    >
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
