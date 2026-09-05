import { describe, expect, it } from 'vitest';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';
import { renderDependencyGraphToDot, resolveGraphPresentation } from './render-dot';

const dependency = (resolved: string, overrides: Partial<MaritimeDependency> = {}): MaritimeDependency => ({
    circular: false, coreModule: false, couldNotResolve: false, dependencyTypes: ['local', 'import'], dynamic: false,
    exoticallyRequired: false, followable: true, module: resolved, moduleSystem: 'es6', resolved, valid: true, ...overrides
});

function fixture(): MaritimeCruiseResult {
    return {
        modules: [
            { source: 'src/features/a.ts', valid: true, dependents: [], dependencies: [
                dependency('src/game/b.ts'),
                dependency('src/types/c.ts', { dependencyTypes: ['local', 'type-only', 'pre-compilation-only'] })
            ] },
            { source: 'src/game/b.ts', valid: true, dependents: [], dependencies: [] },
            { source: 'src/types/c.ts', valid: true, dependents: [], dependencies: [] },
            { source: 'src/vite-env.d.ts', valid: true, orphan: true, dependents: [], dependencies: [] },
            { source: 'tools/generate.ts', valid: true, dependents: [], dependencies: [] }
        ],
        summary: { error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 5, violations: [], optionsUsed: { args: ['src', 'tools'] } }
    };
}

describe('architecture presentation profiles', () => {
    it('compact retains file-level LR topology with architecture presentation and edges-first layering', () => {
        const resolved = resolveGraphPresentation({ graphProfile: 'compact-architecture' });
        expect(resolved.moduleAggregation).toBe('none');
        expect(resolved.visualTheme).toBe('architecture');
        expect(resolved.edgePresentation).toBe('semantic-pairs');
        expect(resolved.clusterRanking).toBe('local');
        expect(resolved.outputOrder).toBe('edges-first');
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' });
        expect(dot).toContain('rankdir="LR"');
        expect(dot).toContain('outputorder="edgesfirst"');
        expect(dot).toContain('"local:src/features/a.ts"');
        expect(dot).not.toContain('"folder:src/features"');
    });

    it('elides one redundant source-root wrapper while retaining namespace IDs', () => {
        const graph = fixture(); graph.modules = graph.modules.filter(module => module.source.startsWith('src/'));
        const dot = renderDependencyGraphToDot(graph, { graphProfile: 'compact-architecture' }, { sourceRoots: ['src'] });
        expect(dot).not.toContain('subgraph "cluster:src"');
        expect(dot).toContain('subgraph "cluster:src/features"');
        expect(dot).toContain('subgraph "cluster:src/game"');
    });

    it('preserves multiple configured roots as top-level namespaces', () => {
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' }, { sourceRoots: ['src', 'tools'] });
        expect(dot).toContain('subgraph "cluster:src"');
        expect(dot).toContain('subgraph "cluster:tools"');
    });

    it('treats repository root as a configured zero-segment source root', () => {
        const graph: MaritimeCruiseResult = {
            modules: [
                { source: 'features/board/components/GameHex.tsx', valid: true, dependents: [], dependencies: [] },
                { source: 'domain/projection.ts', valid: true, dependents: [], dependencies: [] }
            ],
            summary: { error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 2, violations: [], optionsUsed: {} }
        };
        const dot = renderDependencyGraphToDot(graph, { graphProfile: 'architecture-overview', aggregationDepth: 2 }, { sourceRoots: ['.'] });
        expect(dot).toContain('"folder:features/board"');
        expect(dot).toContain('"folder:domain"');
        expect(dot).not.toContain('"folder:features/board/components"');
    });

    it('uses dependency-cruiser semantic node colors with orphan precedence', () => {
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' });
        expect(dot).toMatch(/local:src\/features\/a\.ts.*fillcolor="#ddfeff"/u);
        expect(dot).toMatch(/local:src\/vite-env\.d\.ts.*fillcolor="#ccffcc"/u);
    });

    it('classifies type-only dependency types as secondary without boolean flags', () => {
        const edge = renderDependencyGraphToDot(fixture(), { graphProfile: 'compact-architecture' }).split('\n')
            .find(line => line.includes('"local:src/features/a.ts" -> "local:src/types/c.ts"'));
        expect(edge).toContain('arrowhead="onormal"');
        expect(edge).toContain('style="dashed"');
        expect(edge).toContain('color="#aaaaaa"');
        expect(edge).toContain('penwidth="1"');
    });

    it('keeps a pair primary when runtime and non-runtime evidence share endpoints', () => {
        const graph = fixture(); graph.modules[0].dependencies.push(dependency('src/types/c.ts'));
        const matching = renderDependencyGraphToDot(graph, { graphProfile: 'compact-architecture' }).split('\n')
            .filter(line => line.includes('"local:src/features/a.ts" -> "local:src/types/c.ts"'));
        expect(matching).toHaveLength(1);
        expect(matching[0]).not.toContain('arrowhead="onormal"');
        expect(matching[0]).not.toContain('color="#aaaaaa"');
    });

    it('has no hidden compact-profile behavior: equivalent settings reproduce it', () => {
        const graph = fixture();
        const compact = renderDependencyGraphToDot(graph, { graphProfile: 'compact-architecture' }, { sourceRoots: ['src', 'tools'] });
        const explicit = renderDependencyGraphToDot(graph, {
            externalPackages: 'none', folderGrouping: 'nested', edgeLabels: 'none', layoutDirection: 'lr', rankConstraints: 'all',
            layoutDensity: 'compact', moduleAggregation: 'none', visualTheme: 'architecture', sourceRootGrouping: 'elide-single',
            edgePresentation: 'semantic-pairs', clusterRanking: 'local', outputOrder: 'edges-first', aggregationDepth: 2
        }, { sourceRoots: ['src', 'tools'] });
        expect(explicit).toBe(compact);
    });

    it('architecture-overview is a TB folder-summary intent', () => {
        const resolved = resolveGraphPresentation({ graphProfile: 'architecture-overview' });
        expect(resolved.layoutDirection).toBe('tb');
        const dot = renderDependencyGraphToDot(fixture(), { graphProfile: 'architecture-overview' }, { sourceRoots: ['src', 'tools'] });
        expect(dot).toContain('rankdir="TB"');
        expect(dot).toContain('"folder:src/features"');
        expect(dot).toContain('"folder:src/game"');
        expect(dot).not.toContain('"local:src/features/a.ts"');
    });
});
