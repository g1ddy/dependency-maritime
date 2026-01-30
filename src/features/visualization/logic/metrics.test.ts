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

    // Check Compound Score & Status (Basic checks)
    // A: Loc=0, Comp=0, FanOut=1, Instability=1.
    // Score = 0 + 0 + (1*2) + (1*20) = 22. Warning.
    expect(dataA.metrics?.compoundScore).toBe(22);
    expect(dataA.healthStatus).toBe('warning');

    // B: Loc=0, Comp=0, FanOut=1, Instability=0.5.
    // Score = 0 + 0 + 2 + (0.5*20) = 2 + 10 = 12. Healthy.
    expect(dataB.metrics?.compoundScore).toBe(12);
    expect(dataB.healthStatus).toBe('healthy');
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

    // Score: (20/10) + (5*2) + (0*2) + (0*20) = 2 + 10 + 0 + 0 = 12
    expect(dataA.metrics?.compoundScore).toBe(12);
    expect(dataA.healthStatus).toBe('healthy');
  });

  it('assigns correct health status based on thresholds', () => {
    const graph = new Graph();
    // Unhealthy Node: High Complexity
    graph.addNode('U', { label: 'Unhealthy' });
    // FanOut=0, Instability=0.
    // Need Score > 50.
    // Let Complexity = 26 -> 26*2 = 52.
    const complexityU = { 'U': { complexity: 26, loc: 0 } };

    // Warning Node: Medium
    graph.addNode('W', { label: 'Warning' });
    // Need Score 20-50.
    // Complexity = 10 -> 20.
    const complexityW = { 'W': { complexity: 10, loc: 0 } };

    calculateGraphMetrics(graph, { ...complexityU, ...complexityW });

    const dataU = graph.getNodeAttributes('U') as AppNodeData;
    expect(dataU.metrics?.compoundScore).toBeGreaterThan(50);
    expect(dataU.healthStatus).toBe('unhealthy');

    const dataW = graph.getNodeAttributes('W') as AppNodeData;
    expect(dataW.metrics?.compoundScore).toBeGreaterThanOrEqual(20);
    expect(dataW.metrics?.compoundScore).toBeLessThanOrEqual(50);
    expect(dataW.healthStatus).toBe('warning');
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
