import { describe, expect, it } from 'vitest';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';
import { externalPackageName, renderDependencyGraphToDot } from './render-dot';

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

    it('defaults to type labels and can omit only dependency-type labels', () => {
        expect(renderDependencyGraphToDot(graph())).toContain('[label="local"]');
        expect(renderDependencyGraphToDot(graph(), { edgeLabels: 'none' })).not.toContain('[label="local"]');
    });

    it('retains defaults when optional presentation values are explicitly undefined', () => {
        expect(renderDependencyGraphToDot(graph(), {
            externalPackages: undefined,
            folderGrouping: undefined,
            edgeLabels: undefined
        })).toBe(renderDependencyGraphToDot(graph()));
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
