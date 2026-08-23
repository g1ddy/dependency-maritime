import * as path from 'path';
import type { EslintResult, EslintFileComplexity } from './models';

export function parseEslintComplexityReport(
    eslintResults: EslintResult[],
    cwd: string
): Record<string, EslintFileComplexity> {
    const complexityMap: Record<string, EslintFileComplexity> = {};

    for (const file of eslintResults) {
        const relPath = path.relative(cwd, file.filePath).replace(/\\/g, '/');

        if (file.ignored) {
            complexityMap[relPath] = { complexity: 0, scanned: false };
            continue;
        }

        let maxC = 0;
        for (const msg of file.messages) {
            if (msg.ruleId === 'complexity') {
                const match = msg.message.match(/complexity of (\d+)/);
                if (match) {
                    const c = parseInt(match[1], 10);
                    if (c > maxC) {
                        maxC = c;
                    }
                }
            }
        }

        complexityMap[relPath] = {
            complexity: maxC > 0 ? maxC : 1,
            scanned: true
        };
    }

    return complexityMap;
}
