import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAnalyzeCommand } from './analyze';
import * as adapters from '../analyze/adapters';
import * as fs from 'fs/promises';

describe('runAnalyzeCommand', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue([
            { source: 'src/a.ts', dependencies: [], dependents: [] }
        ]);

        vi.spyOn(adapters, 'runEslintComplexityScan').mockReturnValue([]);
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

    it('should return 1 if missing required arguments', async () => {
        const exitCode = await runAnalyzeCommand(['--source', 'src']);
        expect(exitCode).toBe(1);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('are required'));
    });

    it('should run successfully and return 0 with valid arguments', async () => {
        const exitCode = await runAnalyzeCommand([
            '--source', 'src',
            '--graph', 'graph.json',
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(0);
        expect(adapters.readDependencyGraph).toHaveBeenCalledWith('graph.json');
        expect(adapters.writeOutputFiles).toHaveBeenCalled();
    });
});
