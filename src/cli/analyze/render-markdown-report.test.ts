import { describe, it, expect } from 'vitest';
import { renderMarkdownReport } from './render-markdown-report';
import type { AnalysisResult, AnalysisThresholds } from './models';

describe('render-markdown-report', () => {
    it('should generate a deterministic markdown report', () => {
        const thresholds: AnalysisThresholds = {
            loc: 300,
            complexity: 10,
            fanOut: 15
        };

        const result: AnalysisResult = {
            files: [
                { file: 'src/a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 34 }
            ],
            healthScore: 100,
            topByScore: [
                { file: 'src/a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 34 }
            ],
            topByComplexity: [
                { file: 'src/a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 34 }
            ]
        };

        const reportDate = new Date('2024-01-01T00:00:00.000Z');
        const markdown = renderMarkdownReport(result, thresholds, reportDate);

        expect(markdown).toContain('## 🚨 Automated Complexity Report');
        expect(markdown).toContain('**Last Updated:** 2024-01-01');
        expect(markdown).toContain('### 🏥 Repository Health Score: **100.0 / 100**');
        expect(markdown).toContain('*   **Total Files Scanned**: 1');

        // Check for threshold inclusion in explanation
        expect(markdown).toContain(`LOC > ${thresholds.loc}`);
        expect(markdown).toContain(`Complexity > ${thresholds.complexity}`);
        expect(markdown).toContain(`Fan-Out > ${thresholds.fanOut}`);

        // Check for table content
        expect(markdown).toContain('| `src/a.ts` | **34** | 100 | 5 | 5 | 0.5 |');
        expect(markdown).toContain('| `src/a.ts` | **5** | 100 |');
    });

    it('should correctly escape markdown characters in file paths', () => {
        const result: AnalysisResult = {
            files: [],
            healthScore: 100,
            topByScore: [
                { file: 'src/_internal_/a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 5, instability: 0.5, score: 34 }
            ],
            topByComplexity: []
        };
        const thresholds: AnalysisThresholds = { loc: 300, complexity: 10, fanOut: 15 };
        const reportDate = new Date('2024-01-01T00:00:00.000Z');

        const markdown = renderMarkdownReport(result, thresholds, reportDate);
        expect(markdown).toContain('| `src/\\_internal\\_/a.ts` | **34** | 100 | 5 | 5 | 0.5 |');
    });
});
