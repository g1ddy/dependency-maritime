import { describe, expect, it } from 'vitest';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';
import { renderDependencyGraphToDot, resolveGraphPresentation } from './render-dot';

const dependency = (resolved: string, overrides: Partial<MaritimeDependency> = {}): MaritimeDependency => ({
    circular: false,
    coreModule: false,
    couldNotResolve: false,
    dependencyTypes: ['local', 'import'],
    dynamic: false,
    exoticallyRequired: false,
    followable: true,
    module: resolved,
    moduleSystem: 'es6',
    resolved,
    valid: true,
    ...overrides
});

function fixture(): MaritimeCruiseResult {
    return {
        modules: [
            {
                source: 'src/features/a.ts', valid: true, dependents: [], dependencies: [
                    dependency('src/game/b.ts'),
                    dependency('src/types/c.ts', {
                        dependencyTypes: ['local', 'type-only', 'pre-compilation-only'],
                        typeOnly: true,
                        preCompilationOnly: true
                    })
                ]
            },
            { source: 'src/game/b.ts', valid: true, dependents: [], dependencies: [] },
            { source: 'src/types/c.ts', valid: true, dependents: [], dependencies: [] },
            { source: 'src/vite-env.d.ts', valid: true, orphan: true, dependents: [], dependencies: [] },
            { source: 'tools/generate.ts', valid: true, dependents: [], dependencies: [] }
        ],
        summary: {
            error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 5, violations: [],
            optionsUsed: { args: ['src', 'tools'] }
        }
    };
}

describe('compact architecture reference profile', () => {
    it('keeps file-level LR topology instead of folder aggregation', () => {
        expect(resolveGraphPresentation({ graphProfile: 'compact-architecture' })).toEqual({
            externalPackages: 'none',
            folderGrouping: 'nested',
            edgeLabels: 'none',
            layoutDirection: 'lr',
            rankConstraints: 'all',
            layoutDensity: 'compact',
            moduleAggregation: 'none'
        });

        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' });
        expect(dot).toContain('rankdir="LR"');
        expect(dot).toContain('ranksep="0.12", nodesep="0.10"');
        expect(dot).toContain('"local:src/features/a.ts"');
        expect(dot).not.toContain('"folder:src/features"');
    });

    it('elides one redundant source-root wrapper but preserves nested namespace identity', () => {
        const graph = fixture();
        graph.modules = graph.modules.filter(module => module.source.startsWith('src/'));
        const dot = renderDependencyGraphToDot(
            graph,
            { graphProfile: 'compact-architecture' },
            { sourceRoots: ['src'] }
        );

        expect(dot).not.toContain('subgraph "cluster:src"');
        expect(dot).toContain('subgraph "cluster:src/features"');
        expect(dot).toContain('subgraph "cluster:src/game"');
    });

    it('preserves each configured root as a top-level namespace when multiple roots exist', () => {
        const dot = renderDependencyGraphToDot(
            fixture(),
            { graphProfile: 'compact-architecture' },
            { sourceRoots: ['src', 'tools'] }
        );

        expect(dot).toContain('subgraph "cluster:src"');
        expect(dot).toContain('subgraph "cluster:tools"');
        expect(dot).toContain('subgraph "cluster:src/features"');
    });

    it('uses dependency-cruiser semantic node colors with orphan precedence', () => {
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' });
        expect(dot).toMatch(/local:src\/features\/a\.ts.*fillcolor="#ddfeff"/u);
        expect(dot).toMatch(/local:src\/vite-env\.d\.ts.*fillcolor="#ccffcc"/u);
    });

    it('renders pre-compilation-only pairs as secondary dashed gray edges', () => {
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' });
        const edge = dot.split('\n').find(line => line.includes('"local:src/features/a.ts" -> "local:src/types/c.ts"'));
        expect(edge).toContain('arrowhead="onormal"');
        expect(edge).toContain('style="dashed"');
        expect(edge).toContain('color="#aaaaaa"');
        expect(edge).toContain('penwidth="1"');
    });

    it('keeps a pair primary when runtime and pre-compilation-only evidence share the same endpoints', () => {
        const graph = fixture();
        graph.modules[0].dependencies.push(dependency('src/types/c.ts'));
        const dot = renderDependencyGraphToDot(graph, { graphProfile: 'compact-architecture' });
        const matching = dot.split('\n').filter(line => line.includes('"local:src/features/a.ts" -> "local:src/types/c.ts"'));

        expect(matching).toHaveLength(1);
        expect(matching[0]).not.toContain('arrowhead="onormal"');
        expect(matching[0]).not.toContain('color="#aaaaaa"');
    });

    it('retains explicit folder aggregation as an override rather than a compact-profile default', () => {
        const dot = renderDependencyGraphToDot(fixture(), {
            graphProfile: 'compact-architecture',
            moduleAggregation: 'folders'
        });
        expect(dot).toContain('"folder:src/features"');
        expect(dot).not.toContain('"local:src/features/a.ts"');
    });
});
