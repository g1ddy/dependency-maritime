import { describe, expect, it } from 'vitest';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';
import { externalPackageName, resolveGraphPresentation, renderDependencyGraphToDot } from './render-dot';

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

describe('renderDependencyGraphToDot', () => {
    it('is deterministic and recursively renders roots, sibling files, and nested folders', () => {
        const first = renderDependencyGraphToDot(graph());
        expect(renderDependencyGraphToDot(graph())).toBe(first);
        expect(first).toContain('"cluster:app/domain/schema"');
        expect(first).toContain('"cluster:src/features/board/components"');
        expect(first).toContain('"cluster:src/features/board/hooks"');
        expect(first).toContain('"cluster:tools"');
        expect(first).toContain('label="BoardLayer.tsx"');
        expect(first).toContain('"local:app/domain/projection.ts" -> "local:app/domain/schema/timeline.ts"');
    });

    it('collapses unscoped and scoped packages and excludes node_modules folder clusters', () => {
        const dot = renderDependencyGraphToDot(graph());
        expect(dot).toContain('"external:react" [label="react"');
        expect(dot).toContain('"external:@scope/pkg" [label="@scope/pkg"');
        expect(dot).not.toContain('cluster:node_modules');
        expect(dot).not.toContain('local:node_modules');
        expect(dot).toContain('style="dashed"');
        expect(externalPackageName('/repo/node_modules/@scope/pkg/lib/a.js')).toBe('@scope/pkg');
    });

    it('supports none, summary, and direct external-package policies deterministically', () => {
        const none = renderDependencyGraphToDot(graph(), { externalPackages: 'none' });
        expect(none).not.toContain('external:');
        const summary = renderDependencyGraphToDot(graph(), { externalPackages: 'summary' });
        expect(summary.match(/\[label="External packages"/g)).toHaveLength(1);
        expect(summary).toContain('-> "external:boundary"');
        expect(summary).not.toContain('external:react');
        const direct = renderDependencyGraphToDot(graph(), { externalPackages: 'direct' });
        expect(direct).toContain('external:react');
        expect(direct).toContain('external:@scope/pkg');
        for (const externalPackages of ['none', 'summary', 'direct'] as const) {
            expect(renderDependencyGraphToDot(graph(), { externalPackages })).toBe(renderDependencyGraphToDot(graph(), { externalPackages }));
        }
    });

    it('supports flat, top-level, and nested local folder grouping', () => {
        const flat = renderDependencyGraphToDot(graph(), { folderGrouping: 'none' });
        expect(flat).not.toContain('subgraph "cluster:app');
        const top = renderDependencyGraphToDot(graph(), { folderGrouping: 'top-level' });
        expect(top).toContain('"cluster:app"');
        expect(top).toContain('"cluster:src"');
        expect(top).not.toContain('"cluster:app/domain"');
        const nested = renderDependencyGraphToDot(graph(), { folderGrouping: 'nested' });
        expect(nested).toContain('"cluster:app/domain/schema"');
    });

    it('derives top-level clusters from non-empty absolute-path segments', () => {
        const fixture: MaritimeCruiseResult = {
            modules: [
                { source: '/repo/src/index.ts', valid: true, dependents: [], dependencies: [] },
                { source: '/repo/src/config.ts', valid: true, dependents: [], dependencies: [] }
            ],
            summary: { error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 2, violations: [], optionsUsed: {} }
        };
        const dot = renderDependencyGraphToDot(fixture, { folderGrouping: 'top-level' });
        expect(dot).toContain('"cluster:repo"');
        expect(dot).not.toContain('subgraph "cluster:" {');
    });

    it('defaults to type labels and can omit only dependency-type labels', () => {
        expect(renderDependencyGraphToDot(graph())).toContain('[label="local"]');
        expect(renderDependencyGraphToDot(graph(), { edgeLabels: 'none' })).not.toContain('[label="local"]');
    });

    it('retains defaults when optional presentation values are explicitly undefined', () => {
        expect(renderDependencyGraphToDot(graph(), {
            externalPackages: undefined,
            folderGrouping: undefined,
            edgeLabels: undefined,
            layoutDirection: undefined,
            rankConstraints: undefined,
            layoutDensity: undefined,
            moduleAggregation: undefined
        })).toBe(renderDependencyGraphToDot(graph()));
    });

    it('supports layout direction and compact density without changing the default DOT policy', () => {
        const defaults = renderDependencyGraphToDot(graph());
        expect(defaults).toContain('rankdir="LR"');
        expect(defaults).not.toContain('ranksep=');
        const compactTopToBottom = renderDependencyGraphToDot(graph(), { layoutDirection: 'tb', layoutDensity: 'compact' });
        expect(compactTopToBottom).toContain('rankdir="TB"');
        expect(compactTopToBottom).toContain('ranksep="0.12", nodesep="0.10"');
    });

    it('applies named profiles before explicit presentation overrides', () => {
        expect(resolveGraphPresentation()).toEqual({
            externalPackages: 'direct', folderGrouping: 'nested', edgeLabels: 'types',
            layoutDirection: 'lr', rankConstraints: 'all', layoutDensity: 'normal', moduleAggregation: 'none'
        });
        expect(resolveGraphPresentation({ graphProfile: 'local-architecture' })).toEqual({
            externalPackages: 'none', folderGrouping: 'nested', edgeLabels: 'none',
            layoutDirection: 'lr', rankConstraints: 'all', layoutDensity: 'normal', moduleAggregation: 'none'
        });
        expect(resolveGraphPresentation({ graphProfile: 'compact-architecture' })).toEqual({
            externalPackages: 'none', folderGrouping: 'nested', edgeLabels: 'none',
            layoutDirection: 'lr', rankConstraints: 'all', layoutDensity: 'compact', moduleAggregation: 'none'
        });
        expect(resolveGraphPresentation({ graphProfile: 'compact-architecture', layoutDirection: 'tb' }).layoutDirection).toBe('tb');
    });

    it('renders the compact architecture profile as a local file-level LR graph', () => {
        const dot = renderDependencyGraphToDot(graph(), { graphProfile: 'compact-architecture' });
        expect(dot).toContain('rankdir="LR"');
        expect(dot).toContain('ranksep="0.12", nodesep="0.10"');
        expect(dot).not.toContain('external:');
        expect(dot).not.toContain('[label="local"]');
        expect(dot).toContain('local:src/features/board/BoardLayer.tsx');
        expect(dot).not.toContain('"folder:src/features/board"');
        expect(dot).toContain('style="rounded,bold,filled"');
    });

    it('deterministically aggregates folder dependencies when explicitly requested', () => {
        const fixture = graph();
        fixture.modules[2].dependencies.push(dependency('app/domain/projection.ts'));
        fixture.modules[3].dependencies.push(dependency('app/domain/projection.ts'));
        const options = { graphProfile: 'compact-architecture', moduleAggregation: 'folders' } as const;
        const dot = renderDependencyGraphToDot(fixture, options);
        expect(renderDependencyGraphToDot(fixture, options)).toBe(dot);
        expect(dot.match(/"folder:src\/features\/board" -> "folder:app\/domain"/g)).toHaveLength(1);
        expect(dot).toContain('label="×2"');
    });

    it('keeps compact file-level rendering available explicitly', () => {
        const dot = renderDependencyGraphToDot(graph(), { graphProfile: 'compact-architecture', moduleAggregation: 'none' });
        expect(dot).toContain('local:src/features/board/BoardLayer.tsx');
        expect(dot).not.toContain('folder:src/features/board');
    });

    it('composes folder aggregation with direct and summary external-package modes', () => {
        const direct = renderDependencyGraphToDot(graph(), { moduleAggregation: 'folders', externalPackages: 'direct' });
        expect(direct).toContain('"external:react" [label="react"');
        expect(direct).toContain('"folder:src/features/board" -> "external:react"');
        expect(direct).toContain('"folder:src/features/board" -> "external:@scope/pkg"');

        const summary = renderDependencyGraphToDot(graph(), { moduleAggregation: 'folders', externalPackages: 'summary' });
        expect(summary.match(/\[label="External packages"/g)).toHaveLength(1);
        expect(summary.match(/-> "external:boundary"/g)).toHaveLength(1);
        expect(summary).toContain('label="×2 · npm"');
    });

    it('keeps mixed runtime aggregate edges solid while preserving dependency semantics', () => {
        const fixture = graph();
        fixture.modules[2].dependencies.push(dependency('app/domain/projection.ts', {
            dependencyTypes: ['local', 'type-only'], typeOnly: true
        }));
        fixture.modules[3].dependencies.push(dependency('app/domain/projection.ts', {
            dependencyTypes: ['local'], circular: true, valid: false
        }));
        const edge = renderDependencyGraphToDot(fixture, {
            moduleAggregation: 'folders', externalPackages: 'none', edgeLabels: 'types'
        }).split('\n').find(line => line.includes('"folder:src/features/board" -> "folder:app/domain"'));
        expect(edge).toContain('label="×2 · local · type-only"');
        expect(edge).not.toContain('style="dashed"');
        expect(edge).toContain('color="#d97706"');
        expect(edge).toContain('xlabel="invalid"');
        expect(edge).toContain('fontcolor="#dc2626"');
    });

    it('renders an aggregate edge dashed only when every dependency is non-runtime', () => {
        const fixture = graph();
        fixture.modules[2].dependencies.push(dependency('app/domain/projection.ts', {
            dependencyTypes: ['local', 'type-only'], typeOnly: true
        }));
        fixture.modules[3].dependencies.push(dependency('app/domain/projection.ts', {
            dependencyTypes: ['local'], preCompilationOnly: true
        }));
        const edge = renderDependencyGraphToDot(fixture, {
            moduleAggregation: 'folders', externalPackages: 'none'
        }).split('\n').find(line => line.includes('"folder:src/features/board" -> "folder:app/domain"'));
        expect(edge).toContain('style="dashed"');
    });

    it('keeps every dependency visible while releasing cross-folder rank constraints', () => {
        const constrained = renderDependencyGraphToDot(graph(), { rankConstraints: 'all' });
        const intraFolder = renderDependencyGraphToDot(graph(), { rankConstraints: 'intra-folder' });
        const crossFolder = intraFolder.split('\n').find(line => line.includes('projection.ts" -> "local:app/domain/schema/timeline.ts'));
        expect(crossFolder).not.toContain('constraint="false"');

        const fixture = graph();
        fixture.modules[0].dependencies.push(dependency('src/features/board/BoardLayer.tsx'));
        const released = renderDependencyGraphToDot(fixture, { rankConstraints: 'intra-folder' }).split('\n')
            .find(line => line.includes('projection.ts" -> "local:src/features/board/BoardLayer.tsx'));
        expect(released).toContain('constraint="false"');
        expect(released).toContain('label="local"');
        expect(constrained).not.toContain('constraint="false"');
    });

    it('keeps root-level dependencies rank-constrained in intra-folder mode', () => {
        const fixture: MaritimeCruiseResult = {
            modules: [
                { source: 'index.ts', valid: true, dependents: [], dependencies: [dependency('config.ts')] },
                { source: 'config.ts', valid: true, dependents: [], dependencies: [] }
            ],
            summary: { error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 2, violations: [], optionsUsed: {} }
        };
        const edge = renderDependencyGraphToDot(fixture, { rankConstraints: 'intra-folder' }).split('\n')
            .find(line => line.includes('"local:index.ts" -> "local:config.ts"'));
        expect(edge).not.toContain('constraint="false"');
    });

    it('keeps circular and invalid edge semantics visible without duplicate attributes', () => {
        const fixture = graph();
        fixture.modules[0].dependencies[0] = dependency('app/domain/schema/timeline.ts', {
            circular: true,
            valid: false
        });
        const edge = renderDependencyGraphToDot(fixture).split('\n').find(line => line.includes('projection.ts" ->'));
        expect(edge).toContain('color="#d97706"');
        expect(edge).toContain('xlabel="invalid"');
        expect(edge).toContain('fontcolor="#dc2626"');
        expect(edge?.match(/color=/g)).toHaveLength(2);
        expect(edge?.match(/penwidth=/g)).toHaveLength(1);
    });
});
