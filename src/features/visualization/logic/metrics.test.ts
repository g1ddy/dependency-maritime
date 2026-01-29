import { describe, it, expect } from 'vitest';
import Graph from 'graphology';
import { calculateGraphMetrics } from './metrics';
import { type AppNodeData } from '../types';

describe('calculateGraphMetrics', () => {
  it('calculates instability and centrality correctly for a simple chain', () => {
    const graph = new Graph();

    // Create nodes
    graph.addNode('A', { label: 'Node A' });
    graph.addNode('B', { label: 'Node B' });
    graph.addNode('C', { label: 'Node C' });

    // Create chain: A -> B -> C
    graph.addEdge('A', 'B');
    graph.addEdge('B', 'C');

    calculateGraphMetrics(graph);

    const dataA = graph.getNodeAttributes('A') as AppNodeData;
    const dataB = graph.getNodeAttributes('B') as AppNodeData;
    const dataC = graph.getNodeAttributes('C') as AppNodeData;

    // Check Instability
    // A: Out=1, In=0 => 1 / 1 = 1.0
    expect(dataA.metrics?.instability).toBe(1.0);

    // B: Out=1, In=1 => 1 / 2 = 0.5
    expect(dataB.metrics?.instability).toBe(0.5);

    // C: Out=0, In=1 => 0 / 1 = 0.0
    expect(dataC.metrics?.instability).toBe(0.0);

    // Check Centrality (PageRank)
    // C is referred to by B, B by A. C should be most central.
    expect(dataC.metrics?.centrality).toBeGreaterThan(dataB.metrics?.centrality || 0);
    expect(dataB.metrics?.centrality).toBeGreaterThan(dataA.metrics?.centrality || 0);

    // Check Cyclomatic Complexity (Default is now undefined)
    expect(dataA.metrics?.cyclomaticComplexity).toBeUndefined();
  });

  it('calculates complexity when provided', () => {
    const graph = new Graph();
    graph.addNode('A', { label: 'Node A' });

    const complexityData = {
      'A': { complexity: 5, loc: 20 }
    };

    calculateGraphMetrics(graph, complexityData);

    const dataA = graph.getNodeAttributes('A') as AppNodeData;
    expect(dataA.metrics?.cyclomaticComplexity).toBe(5);
    expect(dataA.metrics?.loc).toBe(20);
  });

  it('handles orphan nodes (division by zero protection)', () => {
    const graph = new Graph();
    graph.addNode('Orphan');

    calculateGraphMetrics(graph);

    const data = graph.getNodeAttributes('Orphan') as AppNodeData;

    // Out=0, In=0 => 0/0. Logic should handle this (likely 0)
    expect(data.metrics?.instability).toBe(0);
    expect(data.metrics?.centrality).toBeDefined();
  });
});
