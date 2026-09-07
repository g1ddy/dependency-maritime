import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateMetrics, calculateInstability, calculateScore, calculateHealthScore, checkUnmeasuredFiles } from './calculate-metrics';
import { ValidationError, type FileMetric, type AnalysisThresholds, type DependencyCruiserModule, type AnalysisResult } from './models';

describe('calculate-metrics', () => {
    describe('calculateInstability', () => {
        it('should return 0 when fanIn and fanOut are 0', () => {
            expect(calculateInstability(0, 0)).toBe(0);
        });

        it('should return 1 when fanIn is 0 and fanOut > 0', () => {
            expect(calculateInstability(0, 5)).toBe(1);
        });

        it('should return 0 when fanIn > 0 and fanOut is 0', () => {
            expect(calculateInstability(5, 0)).toBe(0);
        });

        it('should correctly calculate instability', () => {
            expect(calculateInstability(2, 3)).toBe(3 / 5);
        });
    });

    describe('calculateScore', () => {
        it('should calculate compound score correctly', () => {
            // (LOC / 10) + (Complexity * 2) + (FanOut * 2) + (Instability * 20)
            const score = calculateScore(100, 5, 2, 0.5);
            // (10) + (10) + (4) + (10) = 34
            expect(score).toBe(34);
        });
    });

    describe('calculateHealthScore', () => {
        const thresholds: AnalysisThresholds = {
            loc: 300,
            complexity: 10,
            fanOut: 15
        };

        it('should return 100 for files within thresholds', () => {
            const files: FileMetric[] = [
                { file: 'a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0, scanned: true }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(100);
        });

        it('should deduct 1 point for each threshold exceeded', () => {
            const files: FileMetric[] = [
                { file: 'a.ts', loc: 301, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0, scanned: true },
                { file: 'b.ts', loc: 100, complexity: 11, fanIn: 1, fanOut: 5, instability: 0.5, score: 0, scanned: true },
                { file: 'c.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 16, instability: 0.5, score: 0, scanned: true }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(97);
        });

        it('should not deduct points if equal to threshold', () => {
            const files: FileMetric[] = [
                { file: 'a.ts', loc: 300, complexity: 10, fanIn: 1, fanOut: 15, instability: 0.5, score: 0, scanned: true }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(100);
        });

        it('should clamp health score between 0 and 100', () => {
            const files: FileMetric[] = Array(150).fill({ file: 'a.ts', loc: 400, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0, scanned: true }) as FileMetric[];
            expect(calculateHealthScore(files, thresholds)).toBe(0);
        });
    });

    describe('calculateMetrics', () => {
        const thresholds: AnalysisThresholds = {
            loc: 300,
            complexity: 10,
            fanOut: 15
        };

        const modules: DependencyCruiserModule[] = [
            { source: 'src/a.ts', dependencies: [], dependents: [] },
            { source: 'src/b.ts', dependencies: [{}], dependents: [] },
            { source: 'src/a.test.ts', dependencies: [], dependents: [] },
            { source: 'src/types.d.ts', dependencies: [], dependents: [] },
            { source: 'src/styles.css', dependencies: [], dependents: [] },
            { source: 'src/data.json', dependencies: [], dependents: [] },
            { source: 'other/c.ts', dependencies: [], dependents: [] },
            { source: 'src-old/a.ts', dependencies: [], dependents: [] }
        ];

        const locMap: Record<string, number> = {
            'src/a.ts': 100,
            'src/b.ts': 200,
            'src/a.test.ts': 50,
            'src/types.d.ts': 20,
            'src/styles.css': 30,
            'src/data.json': 40,
            'other/c.ts': 100,
            'src-old/a.ts': 100
        };

        const complexityMap = {
            'src/a.ts': { complexity: 5, scanned: true },
            'src/b.ts': { complexity: 15, scanned: true }
        };

        it('should filter out non-TypeScript files, test files, .d.ts files, and non-source files correctly handling path boundaries', () => {
            const result = calculateMetrics(modules, locMap, complexityMap, thresholds, 'src');

            expect(result.files.length).toBe(2); // src/a.ts and src/b.ts
            expect(result.files.map(f => f.file)).toEqual(['src/a.ts', 'src/b.ts']);
            expect(result.files.map(f => f.file)).not.toContain('src/styles.css');
            expect(result.files.map(f => f.file)).not.toContain('src/data.json');
            expect(result.files.map(f => f.file)).not.toContain('src-old/a.ts');
        });

        it('should correctly sort files by score and complexity', () => {
             const result = calculateMetrics(modules, locMap, complexityMap, thresholds, 'src');

             expect(result.topByScore[0].file).toBe('src/b.ts');
             expect(result.topByComplexity[0].file).toBe('src/b.ts');
        });

        it('should identify unmeasured files when missing from complexity map', () => {
             const result = calculateMetrics([{ source: 'src/a.ts', dependencies: [], dependents: [] }], {'src/a.ts': 100}, {}, thresholds, 'src');
             expect(result.files[0].complexity).toBe(0);
             expect(result.files[0].scanned).toBe(false);
             expect(result.skippedCount).toBe(1);
             expect(result.unmeasuredFiles).toEqual(['src/a.ts']);
        });
    });

    describe('checkUnmeasuredFiles', () => {
        beforeEach(() => {
            vi.spyOn(console, 'log').mockImplementation(() => {});
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('does nothing if skippedCount is 0', () => {
            const mockResult: AnalysisResult = {
                files: [],
                healthScore: 100,
                topByScore: [],
                topByComplexity: [],
                skippedCount: 0,
                unmeasuredFiles: []
            };

            expect(() => checkUnmeasuredFiles(mockResult, true)).not.toThrow();
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('logs warnings when skippedCount > 0 and failOnUnmeasured is false', () => {
            const mockResult: AnalysisResult = {
                files: [],
                healthScore: 100,
                topByScore: [],
                topByComplexity: [],
                skippedCount: 1,
                unmeasuredFiles: ['src/skipped.ts']
            };

            expect(() => checkUnmeasuredFiles(mockResult, false)).not.toThrow();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('1 graph source file(s) were skipped or ignored'));
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('src/skipped.ts'));
        });

        it('throws ValidationError when skippedCount > 0 and failOnUnmeasured is true', () => {
            const mockResult: AnalysisResult = {
                files: [],
                healthScore: 100,
                topByScore: [],
                topByComplexity: [],
                skippedCount: 1,
                unmeasuredFiles: ['src/skipped.ts']
            };

            expect(() => checkUnmeasuredFiles(mockResult, true)).toThrow(ValidationError);
        });
    });
});
