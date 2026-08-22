import { describe, it, expect } from 'vitest';
import { calculateMetrics, calculateInstability, calculateScore, calculateHealthScore } from './calculate-metrics';
import type { FileMetric, AnalysisThresholds, DependencyCruiserModule } from './models';

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
                { file: 'a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0 }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(100);
        });

        it('should deduct 1 point for each threshold exceeded', () => {
            const files: FileMetric[] = [
                { file: 'a.ts', loc: 301, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0 },
                { file: 'b.ts', loc: 100, complexity: 11, fanIn: 1, fanOut: 5, instability: 0.5, score: 0 },
                { file: 'c.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 16, instability: 0.5, score: 0 }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(97);
        });

        it('should not deduct points if equal to threshold', () => {
            const files: FileMetric[] = [
                { file: 'a.ts', loc: 300, complexity: 10, fanIn: 1, fanOut: 15, instability: 0.5, score: 0 }
            ];
            expect(calculateHealthScore(files, thresholds)).toBe(100);
        });

        it('should clamp health score between 0 and 100', () => {
            const files: FileMetric[] = Array(150).fill({ file: 'a.ts', loc: 400, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 0 }) as FileMetric[];
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
            { source: 'other/c.ts', dependencies: [], dependents: [] }
        ];

        const locMap: Record<string, number> = {
            'src/a.ts': 100,
            'src/b.ts': 200,
            'src/a.test.ts': 50,
            'src/types.d.ts': 20,
            'other/c.ts': 100
        };

        const complexityMap: Record<string, number> = {
            'src/a.ts': 5,
            'src/b.ts': 15
        };

        it('should filter out test files, .d.ts files, and non-source files', () => {
            const result = calculateMetrics(modules, locMap, complexityMap, thresholds, 'src');

            expect(result.files.length).toBe(2);
            expect(result.files.map(f => f.file)).toContain('src/a.ts');
            expect(result.files.map(f => f.file)).toContain('src/b.ts');
        });

        it('should correctly sort files by score and complexity', () => {
             const result = calculateMetrics(modules, locMap, complexityMap, thresholds, 'src');

             // b.ts should have higher score and complexity
             expect(result.topByScore[0].file).toBe('src/b.ts');
             expect(result.topByComplexity[0].file).toBe('src/b.ts');
        });

        it('should handle missing complexity with default 1', () => {
             const result = calculateMetrics([{ source: 'src/a.ts', dependencies: [], dependents: [] }], {'src/a.ts': 100}, {}, thresholds, 'src');
             expect(result.files[0].complexity).toBe(1);
        });
    });
});
