
import { describe, it, expect } from 'vitest';
import { createGraphFromCruiseResult, transformToReactFlow } from './transformer';
import type { ICruiseResult } from '../../../schema/dependency-cruiser';

describe('Type Definition Hiding Logic', () => {
  const mockData: ICruiseResult = {
    modules: [
      {
        source: 'src/A.ts',
        dependencies: [
          {
            dynamic: false,
            module: './B',
            moduleSystem: 'es6',
            dependencyTypes: ['local', 'import'], // Normal dependency
            resolved: 'src/B.ts',
            coreModule: false,
            followable: true,
            couldNotResolve: false,
            circular: false,
            valid: true
          },
          {
            dynamic: false,
            module: './C',
            moduleSystem: 'es6',
            dependencyTypes: ['local', 'type-only'], // Type-only dependency
            resolved: 'src/C.ts',
            coreModule: false,
            followable: true,
            couldNotResolve: false,
            circular: false,
            valid: true
          }
        ],
        dependents: [],
        orphan: false,
        valid: true
      },
      {
        source: 'src/B.ts',
        dependencies: [],
        dependents: ['src/A.ts'],
        orphan: false,
        valid: true
      },
      {
        source: 'src/C.ts',
        dependencies: [],
        dependents: ['src/A.ts'],
        orphan: false,
        valid: true
      }
    ],
    summary: {
      violations: [],
      error: 0,
      warn: 0,
      info: 0,
      totalCruised: 3,
      totalDependenciesCruised: 2,
      optionsUsed: {}
    }
  };

  it('removes type-only edges when hideTypeDefinitions is true', () => {
    const graph = createGraphFromCruiseResult(mockData);
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions: true });

    // Verify Edges
    // Should contain A->B (normal)
    // Should NOT contain A->C (type-only)
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe('src/A.ts');
    expect(edges[0].target).toBe('src/B.ts');

    // Verify Nodes
    // All nodes (A, B, C) should still exist
    expect(nodes.length).toBe(3);
    const nodeIds = nodes.map(n => n.id).sort();
    expect(nodeIds).toEqual(['src/A.ts', 'src/B.ts', 'src/C.ts']);

    // C should be isolated (no edges connected to it in the React Flow edges list)
    const edgesConnectedToC = edges.filter(e => e.source === 'src/C.ts' || e.target === 'src/C.ts');
    expect(edgesConnectedToC.length).toBe(0);
  });

  it('keeps type-only edges when hideTypeDefinitions is false', () => {
    const graph = createGraphFromCruiseResult(mockData);
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions: false });

    // Verify Edges
    expect(edges.length).toBe(2);
    const targets = edges.map(e => e.target).sort();
    expect(targets).toEqual(['src/B.ts', 'src/C.ts']);

    // Verify Nodes
    expect(nodes.length).toBe(3);
  });
});
