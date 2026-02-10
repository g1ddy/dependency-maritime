import { describe, it, expect } from 'vitest';
import Graph from 'graphology';
import { calculateGraphMetrics } from './metrics';
import { type ComplexityMetricsMap } from '../types';

describe('Metrics Aggregation', () => {
  it('should calculate aggregated metrics for folders', () => {
    const graph = new Graph({ type: 'directed' });

    // Setup: 2 files in 'src'
    // File 1: src/a.ts
    // File 2: src/b.ts

    // We must provide 'fullPath' attribute as the metric calculator relies on it
    graph.addNode('guid-1', { label: 'a.ts', fullPath: 'src/a.ts' });
    graph.addNode('guid-2', { label: 'b.ts', fullPath: 'src/b.ts' });
    graph.addNode('external', { label: 'external', fullPath: 'external' }); // External dependency

    // Edges for Instability
    // src/a.ts -> external (FanOut=1, FanIn=0, Instability=1.0)
    graph.addEdge('guid-1', 'external');

    // src/b.ts has no edges (Instability=0.0)

    const complexityMetrics: ComplexityMetricsMap = {
      'src/a.ts': { complexity: 10, loc: 100, instability: 0, fanIn: 0, fanOut: 0 },
      'src/b.ts': { complexity: 20, loc: 200, instability: 0, fanIn: 0, fanOut: 0 }
    };

    const folderMetrics = calculateGraphMetrics(graph, complexityMetrics);

    // Verify 'src' folder metrics
    expect(folderMetrics['src']).toBeDefined();
    const srcMetrics = folderMetrics['src']!;

    // Instability:
    // a.ts: 1.0 (1 out / 1 total)
    // b.ts: 0.0
    // Avg: 0.5
    expect(srcMetrics.instability).toBe(0.5);

    // LOC:
    // a.ts: 100
    // b.ts: 200
    // Sum: 300
    expect(srcMetrics.loc).toBe(300);

    // Complexity:
    // a.ts: 10
    // b.ts: 20
    // Sum: 30
    expect(srcMetrics.cyclomaticComplexity).toBe(30);

    // Compound Score:
    // We need to calculate expected compound scores for children first to check average.
    // Score Formula: (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)

    // a.ts: (100/10) + (10*2) + (1*2) + (1.0*20)
    // = 10 + 20 + 2 + 20 = 52

    // b.ts: (200/10) + (20*2) + (0*2) + (0*20)
    // = 20 + 40 + 0 + 0 = 60

    // Avg Score: (52 + 60) / 2 = 56
    expect(srcMetrics.compoundScore).toBe(56);
  });

  it('should handle nested folders', () => {
    const graph = new Graph({ type: 'directed' });
    graph.addNode('guid-3', { label: 'a.ts', fullPath: 'src/features/a.ts' }); // Instability 0

    // Dummy metrics
    const complexityMetrics: ComplexityMetricsMap = {
      'src/features/a.ts': { complexity: 5, loc: 50, instability: 0, fanIn: 0, fanOut: 0 } // Map uses fullPath as key
    };

    const folderMetrics = calculateGraphMetrics(graph, complexityMetrics);

    // Should have metrics for 'src' and 'src/features'
    expect(folderMetrics['src']).toBeDefined();
    expect(folderMetrics['src/features']).toBeDefined();

    expect(folderMetrics['src']!.loc).toBe(50);
    expect(folderMetrics['src/features']!.loc).toBe(50);
  });

  it('handles intermediate folders with no files', () => {
    const graph = new Graph({ multi: false, type: 'directed' });

    // src/a/b/c/file.ts
    // src/a has no files directly.
    // src/a/b has no files directly.
    graph.addNode('fileD', { fullPath: 'src/a/b/c/fileD.ts' });

    const complexityMetrics: ComplexityMetricsMap = {
      'src/a/b/c/fileD.ts': { complexity: 10, loc: 100, instability: 0, fanIn: 0, fanOut: 0 },
    };

    const result = calculateGraphMetrics(graph, complexityMetrics);

    // src/a/b/c
    expect(result['src/a/b/c'].loc).toBe(100);

    // src/a/b
    expect(result['src/a/b'].loc).toBe(100);

    // src/a
    expect(result['src/a'].loc).toBe(100);

    // src
    expect(result['src'].loc).toBe(100);
  });
});
