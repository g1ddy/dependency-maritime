import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAnalyzeCommand } from './analyze';
import * as adapters from '../analyze/adapters';

describe('runAnalyzeCommand', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue([
            { source: 'src/a.ts', dependencies: [], dependents: [] }
        ]);

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
    });

    it('should return 2 if missing required arguments', async () => {
        const exitCode = await runAnalyzeCommand(['--source', 'src']);
        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Either --output or both --metrics and --report must be specified'));
    });

    it('should run successfully and return 0 with valid arguments', async () => {
        const exitCode = await runAnalyzeCommand([
            '--source', 'src',
            '--graph', 'graph.json',
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(0);
        expect(adapters.readDependencyGraph).toHaveBeenCalledWith('graph.json', expect.any(String));
        expect(adapters.writeOutputFiles).toHaveBeenCalled();
    });
});
