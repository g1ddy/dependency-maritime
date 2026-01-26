import { useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../store';
import sampleData from '../../../../sample-data/dependency-graph.json';
import { type ICruiseResult } from '@/schema/dependency-cruiser';

export function DependencyGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setGraphData
  } = useGraphStore();

  useEffect(() => {
    // Load sample data on mount
    // We cast to unknown first because JSON import might be inferred narrowly or broadly
    setGraphData(sampleData as unknown as ICruiseResult);
  }, [setGraphData]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
