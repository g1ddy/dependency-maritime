import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAnalyzeCommand } from './analyze';
import * as adapters from '../analyze/adapters';
import * as graphInput from '../analyze/graph-input';
import * as architectureDebt from '../analyze/architecture-debt';

const graphResult = {
    graph: {
        modules: [{ source: 'src/a.ts', valid: true, dependencies: [], dependents: [] }],
        summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
    },
    modules: [{ source: 'src/a.ts', dependencies: [], dependents: [] }],
    violations: [],
    effectiveGraphPath: `${process.cwd()}/graph.json`
};

describe('runAnalyzeCommand', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.spyOn(graphInput, 'resolveAnalysisGraph').mockResolvedValue(graphResult);
        vi.spyOn(adapters, 'runEslintComplexityScan').mockResolvedValue([
            { filePath: `${process.cwd()}/src/a.ts`, messages: [] }
        ]);
        vi.spyOn(adapters, 'countLinesOfCode').mockResolvedValue({ 'src/a.ts': 100 });
        vi.spyOn(adapters, 'writeOutputFiles').mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should show help and return 0', async () => {
        const exitCode = await runAnalyzeCommand(['--help']);
        expect(exitCode).toBe(0);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage: maritime analyze'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--write-baseline cannot be combined with --baseline'));
    });

    it('should return 2 if missing required arguments', async () => {
        const exitCode = await runAnalyzeCommand(['--source', 'src']);
        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Either --output or both --metrics and --report must be specified'));
    });

    it('rejects baseline creation combined with baseline enforcement', async () => {
        const exitCode = await runAnalyzeCommand([
            '--output', '.maritime',
            '--write-baseline', '.maritime/baseline.json',
            '--baseline', '.maritime/baseline.json',
            '--fail-on-new-violations'
        ]);

        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--write-baseline is an initialization mode'));
        expect(graphInput.resolveAnalysisGraph).not.toHaveBeenCalled();
    });

    it('requires a baseline when fail-on-new-violations is requested', async () => {
        const exitCode = await runAnalyzeCommand([
            '--output', '.maritime',
            '--fail-on-new-violations'
        ]);

        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--fail-on-new-violations requires --baseline'));
        expect(graphInput.resolveAnalysisGraph).not.toHaveBeenCalled();
    });

    it('should run successfully and return 0 with valid arguments and emit manifest data', async () => {
        const exitCode = await runAnalyzeCommand([
            '--source', 'src',
            '--graph', 'graph.json',
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(0);
        expect(graphInput.resolveAnalysisGraph).toHaveBeenCalledWith(expect.objectContaining({
            suppliedGraphPath: 'graph.json'
        }));
        expect(adapters.writeOutputFiles).toHaveBeenCalled();
        const calls = vi.mocked(adapters.writeOutputFiles).mock.calls;
        expect(calls[0][4]).toBe('manifest.json');
        const manifest = calls[0][5] as { schemaVersion: string; artifacts: { graph: string; metrics: string; report: string } };
        expect(manifest.schemaVersion).toBe('1.0.0');
        expect(manifest.artifacts.graph).toBe('graph.json');
        expect(manifest.artifacts.metrics).toBe('metrics.json');
        expect(manifest.artifacts.report).toBe('report.md');
    });

    it('writes a baseline only in explicit baseline initialization mode', async () => {
        vi.spyOn(architectureDebt, 'writeBaselineFile').mockResolvedValue(undefined);

        const exitCode = await runAnalyzeCommand([
            '--source', 'src',
            '--output', '.maritime',
            '--write-baseline', '.maritime/baseline.json'
        ]);

        expect(exitCode).toBe(0);
        expect(architectureDebt.writeBaselineFile).toHaveBeenCalledWith(
            '.maritime/baseline.json',
            [],
            expect.any(String)
        );
    });
});
