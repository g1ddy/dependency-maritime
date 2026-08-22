import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { DependencyCruiserModule, EslintResult } from './models';

export async function readDependencyGraph(graphPath: string): Promise<DependencyCruiserModule[]> {
    try {
        const absolutePath = path.resolve(process.cwd(), graphPath);
        const data = await fs.readFile(absolutePath, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.modules || [];
    } catch (e: any) {
        throw new Error(`Failed to read or parse dependency graph at ${graphPath}: ${e.message}`);
    }
}

export function runEslintComplexityScan(sourcePath: string): EslintResult[] {
    try {
        // Use single quotes for glob to prevent shell expansion issues, but ensure robust path resolution
        // Replace backslashes with forward slashes for cross-platform compatibility with globbing
        const target = path.resolve(process.cwd(), sourcePath).replace(/\\/g, '/');
        const cmd = `npx eslint '${target}/**/*.{ts,tsx}' --format json --rule 'complexity: ["warn", 0]' --parser @typescript-eslint/parser`;

        const output = execSync(cmd, {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        return JSON.parse(output) as EslintResult[];
    } catch (e: any) {
        // ESLint returns exit code 1 if there are warnings (which we expect for complexity > 0)
        if (e.stdout) {
            try {
                return JSON.parse(e.stdout) as EslintResult[];
            } catch (parseError) {
                 throw new Error(`Failed to parse ESLint output: ${e.stdout.substring(0, 200)}...`);
            }
        }

        throw new Error(`Failed to run ESLint: ${e.message}`);
    }
}

export async function countLinesOfCode(sourceFiles: string[]): Promise<Record<string, number>> {
    const locMap: Record<string, number> = {};
    const cwd = process.cwd();

    for (const file of sourceFiles) {
        try {
            const absolutePath = path.resolve(cwd, file);
            const content = await fs.readFile(absolutePath, 'utf8');
            locMap[file] = content.split('\n').length;
        } catch (e) {
            // File not found or unreadable, treat as 0 LOC
            locMap[file] = 0;
        }
    }

    return locMap;
}

export async function writeOutputFiles(
    metricsPath: string,
    metricsData: any,
    reportPath: string,
    reportData: string
): Promise<void> {
    const cwd = process.cwd();

    const absMetricsPath = path.resolve(cwd, metricsPath);
    const absReportPath = path.resolve(cwd, reportPath);

    // Ensure parent directories exist
    await fs.mkdir(path.dirname(absMetricsPath), { recursive: true });
    await fs.mkdir(path.dirname(absReportPath), { recursive: true });

    await Promise.all([
        fs.writeFile(absMetricsPath, JSON.stringify(metricsData, null, 2)),
        fs.writeFile(absReportPath, reportData)
    ]);
}
