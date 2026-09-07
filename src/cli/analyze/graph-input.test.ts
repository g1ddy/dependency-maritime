import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as adapters from './adapters';
import { resolveAnalysisGraph } from './graph-input';

const normalizedGraph = {
    modules: [{ source: 'src/a.ts', valid: true, dependencies: [], dependents: [] }],
    summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
};

describe('resolveAnalysisGraph', () => {
    let workingDir: string;

    beforeEach(async () => {
        workingDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'maritime-graph-input-'));
        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue({
            graph: normalizedGraph,
            modules: [{ source: 'src/a.ts', dependencies: [], dependents: [] }]
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fsPromises.rm(workingDir, { recursive: true, force: true });
    });

    it('serializes an outside supplied graph to the canonical artifact path', async () => {
        const inputPath = path.join(workingDir, 'raw-graph.json');
        const manifestDir = path.join(workingDir, '.maritime');
        const originalBytes = '{"raw":"caller-owned"}\n';
        await fsPromises.writeFile(inputPath, originalBytes);

        const result = await resolveAnalysisGraph({
            suppliedGraphPath: inputPath,
            targetGraphPath: path.join(manifestDir, 'dependency-graph.json'),
            manifestDir,
            rawSources: ['src'],
            workingDir
        });

        expect(result.effectiveGraphPath).toBe(path.join(manifestDir, 'dependency-graph.json'));
        expect(await fsPromises.readFile(result.effectiveGraphPath, 'utf8')).toBe(
            JSON.stringify(result.graph, null, 2)
        );
        expect(await fsPromises.readFile(inputPath, 'utf8')).toBe(originalBytes);
    });

    it('never overwrites a supplied graph that is already at the requested artifact path', async () => {
        const manifestDir = path.join(workingDir, '.maritime');
        const inputPath = path.join(manifestDir, 'dependency-graph.json');
        const originalBytes = '{ "raw": "preserve these exact bytes" }\n';
        await fsPromises.mkdir(manifestDir, { recursive: true });
        await fsPromises.writeFile(inputPath, originalBytes);

        const result = await resolveAnalysisGraph({
            suppliedGraphPath: inputPath,
            targetGraphPath: inputPath,
            manifestDir,
            rawSources: ['src'],
            workingDir
        });

        expect(result.effectiveGraphPath).toBe(path.join(manifestDir, 'maritime-dependency-graph.json'));
        expect(await fsPromises.readFile(inputPath, 'utf8')).toBe(originalBytes);
        expect(await fsPromises.readFile(result.effectiveGraphPath, 'utf8')).toBe(
            JSON.stringify(result.graph, null, 2)
        );
    });
});
