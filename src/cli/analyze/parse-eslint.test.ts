import { describe, it, expect } from 'vitest';
import { parseEslintComplexityReport } from './parse-eslint';
import { EslintResult } from './models';

describe('parse-eslint', () => {
    describe('parseEslintComplexityReport', () => {
        it('should extract max complexity from ESLint JSON output', () => {
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
                }
            ];

            const result = parseEslintComplexityReport(eslintResults, '/path/to/project');

            // Normalize path to relative path
            expect(result['src/a.ts']).toBe(15);
            expect(result['src/b.ts']).toBeUndefined();
        });

        it('should handle invalid or empty ESLint output', () => {
            expect(parseEslintComplexityReport([], '/path/to/project')).toEqual({});
        });

        it('should safely ignore non-complexity rule messages', () => {
             const eslintResults: EslintResult[] = [
                {
                    filePath: '/project/src/a.ts',
                    messages: [
                        { ruleId: 'other-rule', message: "Function 'X' has a complexity of 10. Maximum allowed is 0." },
                    ]
                }
            ];
            const result = parseEslintComplexityReport(eslintResults, '/project');
            expect(result['src/a.ts']).toBeUndefined();
        });
    });
});
