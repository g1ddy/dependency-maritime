import { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import graphData from '../../../../config/dependency-graph.json';
import { CruiseResultSchema } from '@/schema/dependency-cruiser';
import { AppNode } from './AppNode';

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
    selectNode
  } = useGraphStore();

  const nodeTypes = useMemo(() => ({ appNode: AppNode }), []);

  useEffect(() => {
    // Load graph data on mount
    const parsedData = CruiseResultSchema.parse(graphData);
    setGraphData(parsedData);
  }, [setGraphData]);

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
