import * as path from 'path';
import { EslintResult } from './models';

export function parseEslintComplexityReport(eslintResults: EslintResult[], cwd: string): Record<string, number> {
    const complexityMap: Record<string, number> = {};

    for (const file of eslintResults) {
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

        if (maxC > 0) {
            // Use path.relative to get the relative path to CWD, avoiding hardcoded process.cwd() for purity
            // Path module handles cross-platform logic, but replacing backslashes ensures consistent output format
            const relPath = path.relative(cwd, file.filePath).replace(/\\/g, '/');
            complexityMap[relPath] = maxC;
        }
    }

    return complexityMap;
}
