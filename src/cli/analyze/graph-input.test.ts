import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fsPromises from 'node:fs/promises';
import { resolveGraphInput } from './graph-input';
import * as adapters from './adapters';
import type { ICruiseResult } from 'dependency-cruiser';

vi.mock('node:fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs/promises')>();
    return {
        ...actual,
        mkdir: vi.fn().mockResolvedValue(undefined),
        copyFile: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined)
    };
});

describe('resolveGraphInput', () => {
    const workingDir = '/project';
    const manifestDir = '/project/.maritime';

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('reads supplied graph inside manifest directory without staging', async () => {
        const mockModules = [{ source: 'src/a.ts', dependencies: [], dependents: [] }];
        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue(mockModules);

        const result = await resolveGraphInput({
            graphPath: '.maritime/dependency-graph.json',
            targetGraphPath: '.maritime/dependency-graph.json',
            rawSources: ['src'],
            manifestDir,
            workingDir
        });

        expect(result.isGraphSupplied).toBe(true);
        expect(result.modules).toEqual(mockModules);
        expect(result.effectiveGraphPath).toBe(path.resolve(workingDir, '.maritime/dependency-graph.json'));
        expect(fsPromises.copyFile).not.toHaveBeenCalled();
    });

    it('stages supplied graph into manifest directory when path is outside', async () => {
        const mockModules = [{ source: 'src/a.ts', dependencies: [], dependents: [] }];
        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue(mockModules);

        const result = await resolveGraphInput({
            graphPath: '../outside/graph.json',
            targetGraphPath: '.maritime/dependency-graph.json',
            rawSources: ['src'],
            manifestDir,
            workingDir
        });

        expect(result.isGraphSupplied).toBe(true);
        expect(result.modules).toEqual(mockModules);
        expect(result.effectiveGraphPath).toBe(path.join(manifestDir, 'graph.json'));
        expect(fsPromises.mkdir).toHaveBeenCalledWith(manifestDir, { recursive: true });
        expect(fsPromises.copyFile).toHaveBeenCalledWith(
            path.resolve(workingDir, '../outside/graph.json'),
            path.join(manifestDir, 'graph.json')
        );
    });

    it('throws error when staging outside graph fails', async () => {
        vi.spyOn(adapters, 'readDependencyGraph').mockResolvedValue([]);
        vi.mocked(fsPromises.copyFile).mockRejectedValueOnce(new Error('Disk full'));

        await expect(resolveGraphInput({
            graphPath: '../outside/graph.json',
            targetGraphPath: '.maritime/dependency-graph.json',
            rawSources: ['src'],
            manifestDir,
            workingDir
        })).rejects.toThrow('Failed to stage supplied dependency graph into artifact directory: Disk full');
    });

    it('generates graph when graphPath is omitted', async () => {
        const mockModules = [{ source: 'src/b.ts', dependencies: [], dependents: [] }];
        const mockCruiseResult = { modules: mockModules, summary: {} } as unknown as ICruiseResult;

        vi.spyOn(adapters, 'generateDependencyGraph').mockResolvedValue({
            modules: mockModules,
            cruiseResult: mockCruiseResult,
            configSource: 'fallback'
        });

        const result = await resolveGraphInput({
            graphPath: undefined,
            targetGraphPath: '.maritime/dependency-graph.json',
            rawSources: ['src'],
            depcruiseConfig: undefined,
            manifestDir,
            workingDir
        });

        expect(result.isGraphSupplied).toBe(false);
        expect(result.configSource).toBe('fallback');
        expect(result.modules).toEqual(mockModules);
        expect(result.effectiveGraphPath).toBe(path.resolve(workingDir, '.maritime/dependency-graph.json'));
        expect(adapters.generateDependencyGraph).toHaveBeenCalledWith({
            sourceRoots: ['src'],
            configPath: undefined,
            cwd: workingDir
        });
        expect(fsPromises.writeFile).toHaveBeenCalledWith(
            path.resolve(workingDir, '.maritime/dependency-graph.json'),
            JSON.stringify(mockCruiseResult, null, 2)
        );
    });
});
