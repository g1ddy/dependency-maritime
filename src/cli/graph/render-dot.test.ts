import { describe, expect, it } from 'vitest';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';
import { aggregationFolder, externalPackageName, resolveGraphPresentation, renderDependencyGraphToDot } from './render-dot';

const dependency = (resolved: string, overrides: Partial<MaritimeDependency> = {}): MaritimeDependency => ({
    circular: false, coreModule: false, couldNotResolve: false, dependencyTypes: ['local'],
    dynamic: false, exoticallyRequired: false, followable: true, module: resolved,
    moduleSystem: 'es6', resolved, valid: true, instability: 0, ...overrides
});

const graph = (): MaritimeCruiseResult => ({
    modules: [
        { source: 'app/domain/projection.ts', valid: true, dependents: [], dependencies: [dependency('app/domain/schema/timeline.ts')] },
        { source: 'app/domain/schema/timeline.ts', valid: true, dependents: [], dependencies: [] },
        { source: 'src/features/board/BoardLayer.tsx', valid: true, dependents: [], dependencies: [
            dependency('node_modules/react/index.js', { module: 'react', dependencyTypes: ['npm'] }),
            dependency('node_modules/@scope/pkg/dist/index.js', { module: '@scope/pkg', dependencyTypes: ['npm'], typeOnly: true })
        ] },
        { source: 'src/features/board/components/GameHex.tsx', valid: true, dependents: [], dependencies: [] },
        { source: 'src/features/board/hooks/useBoardInteractions.ts', valid: true, dependents: [], dependencies: [] },
        { source: 'tools/new-top-level.ts', valid: true, dependents: [], dependencies: [] },
        { source: 'node_modules/react/index.js', valid: true, dependents: [], dependencies: [] }
    ],
    summary: { error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 7, violations: [], optionsUsed: {} }
});

const commonPresentation = {
    folderGrouping: 'nested', layoutDirection: 'lr', rankConstraints: 'all', aggregationDepth: 2
} as const;

describe('renderDependencyGraphToDot', () => {
    it('renders deterministic nested file-level graphs by default', () => {
        const first = renderDependencyGraphToDot(graph());
        expect(renderDependencyGraphToDot(graph())).toBe(first);
        expect(first).toContain('"cluster:app/domain/schema"');
        expect(first).toContain('"cluster:src/features/board/components"');
        expect(first).toContain('label="BoardLayer.tsx"');
        expect(first).toContain('"local:app/domain/projection.ts" -> "local:app/domain/schema/timeline.ts"');
    });

    it('supports none, summary, and direct external-package policies', () => {
        expect(renderDependencyGraphToDot(graph(), { externalPackages: 'none' })).not.toContain('external:');
        const summary = renderDependencyGraphToDot(graph(), { externalPackages: 'summary' });
        expect(summary).toContain('"external:boundary"');
        expect(summary).not.toContain('external:react');
        const direct = renderDependencyGraphToDot(graph(), { externalPackages: 'direct' });
        expect(direct).toContain('external:react');
        expect(direct).toContain('external:@scope/pkg');
        expect(externalPackageName('/repo/node_modules/@scope/pkg/lib/a.js')).toBe('@scope/pkg');
    });

    it('supports flat, top-level, and nested folder grouping', () => {
        expect(renderDependencyGraphToDot(graph(), { folderGrouping: 'none' })).not.toContain('subgraph "cluster:app');
        const top = renderDependencyGraphToDot(graph(), { folderGrouping: 'top-level' });
        expect(top).toContain('"cluster:app"');
        expect(top).not.toContain('"cluster:app/domain"');
        expect(renderDependencyGraphToDot(graph(), { folderGrouping: 'nested' })).toContain('"cluster:app/domain/schema"');
    });

    it('keeps explicit undefined settings equivalent to defaults', () => {
        expect(renderDependencyGraphToDot(graph(), {
            externalPackages: undefined, folderGrouping: undefined, edgeLabels: undefined,
            layoutDirection: undefined, rankConstraints: undefined, layoutDensity: undefined,
            moduleAggregation: undefined, visualTheme: undefined, sourceRootGrouping: undefined,
            edgePresentation: undefined, clusterRanking: undefined, aggregationDepth: undefined
        })).toBe(renderDependencyGraphToDot(graph()));
    });

    it('defines profiles entirely as declarative presentation presets', () => {
        expect(resolveGraphPresentation()).toEqual({
            externalPackages: 'direct', edgeLabels: 'types', layoutDensity: 'normal', moduleAggregation: 'none',
            visualTheme: 'standard', sourceRootGrouping: 'preserve', edgePresentation: 'relations', clusterRanking: 'global',
            ...commonPresentation
        });
        expect(resolveGraphPresentation({ graphProfile: 'local-architecture' })).toEqual({
            externalPackages: 'none', edgeLabels: 'none', layoutDensity: 'normal', moduleAggregation: 'none',
            visualTheme: 'standard', sourceRootGrouping: 'preserve', edgePresentation: 'relations', clusterRanking: 'global',
            ...commonPresentation
        });
        expect(resolveGraphPresentation({ graphProfile: 'compact-architecture' })).toEqual({
            externalPackages: 'none', edgeLabels: 'none', layoutDensity: 'compact', moduleAggregation: 'none',
            visualTheme: 'architecture', sourceRootGrouping: 'elide-single', edgePresentation: 'semantic-pairs', clusterRanking: 'local',
            ...commonPresentation
        });
        expect(resolveGraphPresentation({ graphProfile: 'architecture-overview' })).toEqual({
            externalPackages: 'none', edgeLabels: 'none', layoutDensity: 'normal', moduleAggregation: 'folders',
            visualTheme: 'architecture', sourceRootGrouping: 'preserve', edgePresentation: 'semantic-pairs', clusterRanking: 'global',
            ...commonPresentation
        });
    });

    it('lets explicit settings override every profile characteristic', () => {
        const resolved = resolveGraphPresentation({
            graphProfile: 'compact-architecture', visualTheme: 'standard', sourceRootGrouping: 'preserve',
            edgePresentation: 'relations', clusterRanking: 'global', layoutDensity: 'normal', moduleAggregation: 'folders',
            aggregationDepth: 3
        });
        expect(resolved.visualTheme).toBe('standard');
        expect(resolved.sourceRootGrouping).toBe('preserve');
        expect(resolved.edgePresentation).toBe('relations');
        expect(resolved.clusterRanking).toBe('global');
        expect(resolved.layoutDensity).toBe('normal');
        expect(resolved.moduleAggregation).toBe('folders');
        expect(resolved.aggregationDepth).toBe(3);
    });

    it('rejects invalid aggregation depth', () => {
        expect(() => resolveGraphPresentation({ aggregationDepth: 0 })).toThrow('positive integer');
        expect(() => resolveGraphPresentation({ aggregationDepth: 1.5 })).toThrow('positive integer');
    });

    it('renders compact architecture as local file-level LR architecture styling', () => {
        const dot = renderDependencyGraphToDot(graph(), { graphProfile: 'compact-architecture' });
        expect(dot).toContain('rankdir="LR"');
        expect(dot).toContain('ranksep="0.12", nodesep="0.10"');
        expect(dot).not.toContain('newrank="true"');
        expect(dot).not.toContain('external:');
        expect(dot).toContain('local:src/features/board/BoardLayer.tsx');
        expect(dot).not.toContain('"folder:src/features/board"');
        expect(dot).toContain('style="rounded,bold,filled"');
    });

    it('renders architecture-overview as source-root-relative folder aggregation', () => {
        const fixture = graph();
        fixture.modules[2].dependencies.push(dependency('app/domain/projection.ts'));
        fixture.summary.optionsUsed = { args: ['app', 'src', 'tools'] };
        const dot = renderDependencyGraphToDot(fixture, { graphProfile: 'architecture-overview' });
        expect(dot).toContain('"folder:src/features/board"');
        expect(dot).toContain('"folder:app/domain"');
        expect(dot).not.toContain('local:src/features/board/BoardLayer.tsx');
        expect(dot).toContain('newrank="true"');
    });

    it('computes aggregation depth relative to configured source roots', () => {
        expect(aggregationFolder('src/features/board/components/GameHex.tsx', ['src'], 2)).toBe('src/features/board');
        expect(aggregationFolder('src/features/board/components/GameHex.tsx', ['src'], 1)).toBe('src/features');
        expect(aggregationFolder('src/features/board/components/GameHex.tsx', ['src'], 2, 'elide-single')).toBe('features/board');
        expect(aggregationFolder('frontend/features/board/GameHex.tsx', ['frontend', 'backend'], 2)).toBe('frontend/features/board');
    });

    it('keeps mixed runtime aggregate edges solid', () => {
        const fixture = graph();
        fixture.modules[2].dependencies.push(dependency('app/domain/projection.ts', { typeOnly: true, dependencyTypes: ['local', 'type-only'] }));
        fixture.modules[3].dependencies.push(dependency('app/domain/projection.ts'));
        const edge = renderDependencyGraphToDot(fixture, {
            moduleAggregation: 'folders', externalPackages: 'none', edgeLabels: 'types'
        }).split('\n').find(line => line.includes('"folder:src/features/board" -> "folder:app/domain"'));
        expect(edge).toContain('×2');
        expect(edge).not.toContain('style="dashed"');
    });

    it('renders semantic pairs secondary only when every relation is non-runtime', () => {
        const fixture = graph();
        fixture.modules[0].dependencies = [
            dependency('app/domain/schema/timeline.ts', { preCompilationOnly: true, dependencyTypes: ['local', 'pre-compilation-only'] })
        ];
        const edge = renderDependencyGraphToDot(fixture, {
            externalPackages: 'none', edgeLabels: 'none', edgePresentation: 'semantic-pairs'
        }).split('\n').find(line => line.includes('projection.ts" -> "local:app/domain/schema/timeline.ts'));
        expect(edge).toContain('arrowhead="onormal"');
        expect(edge).toContain('style="dashed"');
        expect(edge).toContain('color="#aaaaaa"');
    });

    it('keeps circular and invalid relationship semantics', () => {
        const fixture = graph();
        fixture.modules[0].dependencies[0] = dependency('app/domain/schema/timeline.ts', { circular: true, valid: false });
        const edge = renderDependencyGraphToDot(fixture).split('\n').find(line => line.includes('projection.ts" ->'));
        expect(edge).toContain('color="#d97706"');
        expect(edge).toContain('xlabel="invalid"');
        expect(edge).toContain('fontcolor="#dc2626"');
    });
});
