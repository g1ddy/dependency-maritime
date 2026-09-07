import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'node:fs/promises';
import * as adapters from './adapters';
import { resolveAnalysisGraph } from './graph-input';

vi.mock('node:fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs/promises')>();
    return {
        ...actual,
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined)
    };
});

describe('resolveAnalysisGraph', () => {
    beforeEach(() => {
        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue({
            graph: {
                modules: [{ source: 'src/a.ts', valid: true, dependencies: [], dependents: [] }],
                summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
            },
            modules: [{ source: 'src/a.ts', dependencies: [], dependents: [] }]
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('serializes the normalized graph instead of copying raw supplied bytes', async () => {
        const result = await resolveAnalysisGraph({
            suppliedGraphPath: '../raw-graph.json',
            targetGraphPath: '.maritime/dependency-graph.json',
            manifestDir: '/repo/.maritime',
            rawSources: ['src'],
            workingDir: '/repo'
        });

        expect(result.effectiveGraphPath).toBe('/repo/.maritime/raw-graph.json');
        expect(fsPromises.writeFile).toHaveBeenCalledWith(
            '/repo/.maritime/raw-graph.json',
            JSON.stringify(result.graph, null, 2)
        );
    });
});
