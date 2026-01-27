
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
            dependencyTypes: ['local', 'type-only'], // Standard Type-only dependency
            resolved: 'src/C.ts',
            coreModule: false,
            followable: true,
            couldNotResolve: false,
            circular: false,
            valid: true
          },
          {
             dynamic: false,
             module: './D',
             moduleSystem: 'es6',
             // New format from tsPreCompilationDeps: 'specify'
             dependencyTypes: ['local', 'type-only', 'pre-compilation-only'],
             resolved: 'src/D.ts',
             coreModule: false,
             followable: true,
             couldNotResolve: false,
             circular: false,
             valid: true,
             preCompilationOnly: true
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
      },
      {
        source: 'src/D.ts',
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
      totalCruised: 4,
      totalDependenciesCruised: 3,
      optionsUsed: {}
    }
  };

  it('removes type-only edges (including pre-compilation-only) when hideTypeDefinitions is true', () => {
    const graph = createGraphFromCruiseResult(mockData);
    const { edges } = transformToReactFlow(graph, { hideTypeDefinitions: true });

    // Verify Edges
    // Should contain A->B (normal)
    // Should NOT contain A->C (type-only)
    // Should NOT contain A->D (pre-compilation-only with type-only tag)
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe('src/A.ts');
    expect(edges[0].target).toBe('src/B.ts');
  });

  it('keeps type-only edges when hideTypeDefinitions is false', () => {
    const graph = createGraphFromCruiseResult(mockData);
    const { edges } = transformToReactFlow(graph, { hideTypeDefinitions: false });

    // Verify Edges
    expect(edges.length).toBe(3);
    const targets = edges.map(e => e.target).sort();
    expect(targets).toEqual(['src/B.ts', 'src/C.ts', 'src/D.ts']);
  });
});
