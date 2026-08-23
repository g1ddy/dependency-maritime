import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { readDependencyGraph, runEslintComplexityScan } from './adapters';
import { ValidationError } from './models';
import { ESLint } from 'eslint';

vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn()
}));

vi.mock('eslint', () => {
    return {
        ESLint: vi.fn()
    };
});

describe('adapters', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('readDependencyGraph', () => {
        it('should return modules for valid JSON and schema', async () => {
            const validData = {
                modules: [{ source: 'src/a.ts', valid: true, dependencies: [], dependents: [] }],
                summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
            };
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validData));

            const result = await readDependencyGraph('dummy.json');
            expect(result).toHaveLength(1);
            expect(result[0].source).toBe('src/a.ts');
        });

        it('should throw Error if file cannot be read', async () => {
            vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
            await expect(readDependencyGraph('dummy.json')).rejects.toThrow('Failed to read dependency graph');
        });

        it('should throw ValidationError if JSON is malformed', async () => {
            vi.mocked(fs.readFile).mockResolvedValue('invalid json {');
            await expect(readDependencyGraph('dummy.json')).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError if schema is invalid', async () => {
            const invalidData = {
                modules: 'not an array'
            };
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidData));
            await expect(readDependencyGraph('dummy.json')).rejects.toThrow(ValidationError);
        });
    });

    describe('runEslintComplexityScan', () => {
        it('should return mapped results on success', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            const mockResults = [{
                filePath: `${process.cwd()}/src/a.ts`,
                messages: [{ ruleId: 'complexity', message: 'Too complex' }]
            }];

            vi.mocked(ESLint).mockImplementation(function() {
                return {
                    isPathIgnored: vi.fn().mockResolvedValue(false),
                    lintFiles: vi.fn().mockResolvedValue(mockResults)
                } as unknown as ESLint;
            });

            const result = await runEslintComplexityScan('src', ['src/a.ts']);
            expect(result).toHaveLength(1);
            expect(result[0].filePath).toBe(`${process.cwd()}/src/a.ts`);
            expect(result[0].messages[0].ruleId).toBe('complexity');
        });

        it('should identify ignored files when isPathIgnored returns true', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(ESLint).mockImplementation(function() {
                return {
                    isPathIgnored: vi.fn().mockResolvedValue(true),
                    lintFiles: vi.fn().mockResolvedValue([])
                } as unknown as ESLint;
            });

            const result = await runEslintComplexityScan('src', ['build/sites-vite-plugin.ts']);
            expect(result).toHaveLength(1);
            expect(result[0].ignored).toBe(true);
        });

        it('should treat stale/missing file paths as unmeasured/ignored', async () => {
            vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
            vi.mocked(ESLint).mockImplementation(function() {
                return {
                    isPathIgnored: vi.fn(),
                    lintFiles: vi.fn()
                } as unknown as ESLint;
            });

            const result = await runEslintComplexityScan('src', ['src/deleted-file.ts']);
            expect(result).toHaveLength(1);
            expect(result[0].ignored).toBe(true);
        });

        it('should throw Error if initializing ESLint fails', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(ESLint).mockImplementation(function() {
                throw new Error('Fatal ESLint init failure');
            });

            await expect(runEslintComplexityScan('src', ['src/a.ts'])).rejects.toThrow('Failed to run ESLint: Fatal ESLint init failure');
        });
    });
});
