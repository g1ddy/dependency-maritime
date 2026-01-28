
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
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions: true });

    // Lookup node IDs
    const idA = nodes.find(n => n.data.fullPath === 'src/A.ts')?.id;
    const idB = nodes.find(n => n.data.fullPath === 'src/B.ts')?.id;
    const idC = nodes.find(n => n.data.fullPath === 'src/C.ts')?.id;
    const idD = nodes.find(n => n.data.fullPath === 'src/D.ts')?.id;

    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(idC).toBeDefined();
    expect(idD).toBeDefined();

    // Verify Edges
    // Should contain A->B (normal)
    // Should NOT contain A->C (type-only)
    // Should NOT contain A->D (pre-compilation-only with type-only tag)
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe(idA);
    expect(edges[0].target).toBe(idB);

    // Verify Nodes
    // All nodes (A, B, C, D) should still exist
    expect(nodes.length).toBeGreaterThanOrEqual(4);

    // C and D should be isolated (no edges connected to them in the React Flow edges list)
    const edgesConnectedToTypeNodes = edges.filter(
      e => [idC, idD].includes(e.source) || [idC, idD].includes(e.target)
    );
    expect(edgesConnectedToTypeNodes.length).toBe(0);
  });

  it('keeps type-only edges when hideTypeDefinitions is false', () => {
    const graph = createGraphFromCruiseResult(mockData);
    const { nodes, edges } = transformToReactFlow(graph, { hideTypeDefinitions: false });

    // Lookup node IDs
    const idA = nodes.find(n => n.data.fullPath === 'src/A.ts')?.id;
    const idB = nodes.find(n => n.data.fullPath === 'src/B.ts')?.id;
    const idC = nodes.find(n => n.data.fullPath === 'src/C.ts')?.id;
    const idD = nodes.find(n => n.data.fullPath === 'src/D.ts')?.id;

    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(idC).toBeDefined();
    expect(idD).toBeDefined();

    // Verify Edges
    expect(edges.length).toBe(3);
    const targets = edges.map(e => e.target).sort();

    // We expect targets to be B, C, D IDs
    const expectedTargets = [idB, idC, idD].sort();
    expect(targets).toEqual(expectedTargets);

    // Verify Nodes
    expect(nodes.length).toBeGreaterThanOrEqual(4);
  });
});
