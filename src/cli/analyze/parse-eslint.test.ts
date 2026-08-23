import { describe, it, expect } from 'vitest';
import { parseEslintComplexityReport } from './parse-eslint';
import type { EslintResult } from './models';

describe('parse-eslint', () => {
    describe('parseEslintComplexityReport', () => {
        it('should extract max complexity and scanned status from ESLint output', () => {
            const eslintResults: EslintResult[] = [
                {
                    filePath: '/path/to/project/src/a.ts',
                    messages: [
                        { ruleId: 'complexity', message: "Function 'X' has a complexity of 10. Maximum allowed is 0." },
                        { ruleId: 'complexity', message: "Function 'Y' has a complexity of 15. Maximum allowed is 0." }
                    ]
                },
                {
                    filePath: '/path/to/project/src/b.ts',
                    messages: [
                        { ruleId: 'no-unused-vars', message: "Var unused." }
                    ]
                },
                {
                    filePath: '/path/to/project/build/sites-vite-plugin.ts',
                    ignored: true,
                    messages: []
                }
            ];

            const result = parseEslintComplexityReport(eslintResults, '/path/to/project');

            expect(result['src/a.ts']).toEqual({ complexity: 15, scanned: true });
            expect(result['src/b.ts']).toEqual({ complexity: 1, scanned: true });
            expect(result['build/sites-vite-plugin.ts']).toEqual({ complexity: 0, scanned: false });
        });

        it('should handle empty ESLint output', () => {
            expect(parseEslintComplexityReport([], '/path/to/project')).toEqual({});
        });

        it('should report base complexity 1 and scanned: true when no complexity messages are generated', () => {
            const eslintResults: EslintResult[] = [
                {
                    filePath: '/project/src/a.ts',
                    messages: [
                        { ruleId: 'other-rule', message: "Some other error." }
                    ]
                }
            ];
            const result = parseEslintComplexityReport(eslintResults, '/project');
            expect(result['src/a.ts']).toEqual({ complexity: 1, scanned: true });
        });
    });
});
