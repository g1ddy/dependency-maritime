import { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS import might not be recognized by tsc but works in Vite
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import sampleData from '../../../../sample-data/dependency-graph.json';
import { CruiseResultSchema } from '@/schema/dependency-cruiser';
import { AppNode } from './AppNode';

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
    // Load sample data on mount
    const parsedData = CruiseResultSchema.parse(sampleData);
    setGraphData(parsedData);
  }, [setGraphData]);

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
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
