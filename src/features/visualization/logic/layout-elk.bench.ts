import { bench, describe } from 'vitest';
import { applyElkLayout } from './layout-elk';
import type { Node, Edge } from '@xyflow/react';

// Helper to generate a mock graph
function generateMockGraph(nodeCount: number) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      position: { x: 0, y: 0 },
      data: { label: `Node ${i}` },
    });

    if (i > 0) {
      // Connect to the previous node to create a long chain
      edges.push({
        id: `edge-${i-1}-${i}`,
        source: `node-${i-1}`,
        target: `node-${i}`,
      });
    }
  }

  return { nodes, edges };
}

const graph100 = generateMockGraph(100);
const graph500 = generateMockGraph(500);
const graph1000 = generateMockGraph(1000);
const graph2000 = generateMockGraph(2000);

describe('ELK Layout Optimization', () => {
  bench('applyElkLayout - 100 nodes', async () => {
    await applyElkLayout(graph100.nodes, graph100.edges);
  });

  bench('applyElkLayout - 500 nodes', async () => {
    await applyElkLayout(graph500.nodes, graph500.edges);
  });

  bench('applyElkLayout - 1000 nodes', async () => {
    await applyElkLayout(graph1000.nodes, graph1000.edges);
  });

  bench('applyElkLayout - 2000 nodes', async () => {
    await applyElkLayout(graph2000.nodes, graph2000.edges);
  });
});
