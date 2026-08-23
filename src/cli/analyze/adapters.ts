import * as fs from 'fs/promises';
import * as path from 'path';
import { ESLint } from 'eslint';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { ValidationError, type DependencyCruiserModule, type EslintResult } from './models';

export async function readDependencyGraph(graphPath: string): Promise<DependencyCruiserModule[]> {
    const absolutePath = path.resolve(process.cwd(), graphPath);
    let data: string;
    let parsed: unknown;

    try {
        data = await fs.readFile(absolutePath, 'utf8');
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to read dependency graph at ${graphPath}: ${message}`);
    }

    try {
        parsed = JSON.parse(data);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new ValidationError(`Invalid JSON in dependency graph at ${graphPath}: ${message}`);
    }

    const validationResult = CruiseResultSchema.safeParse(parsed);

    if (!validationResult.success) {
        throw new ValidationError(`Invalid dependency-cruiser output shape in ${graphPath}:\n${validationResult.error.message}`);
    }

    // Return using the validated structure, picking only what we need
    return validationResult.data.modules.map(m => ({
        source: m.source,
        dependencies: m.dependencies,
        dependents: m.dependents
    }));
}

export async function runEslintComplexityScan(sourcePath: string): Promise<EslintResult[]> {
    try {
        // Replace backslashes with forward slashes for cross-platform compatibility with globbing
        const target = path.resolve(process.cwd(), sourcePath).replace(/\\/g, '/');
        const globPattern = `${target}/**/*.{ts,tsx}`;

        const eslint = new ESLint({
            overrideConfig: [{
                rules: {
                    'complexity': ['warn', 0]
                }
            }]
        });

        const results = await eslint.lintFiles([globPattern]);

        // Map ESLint's API results to the EslintResult interface we defined
        return results.map(result => ({
            filePath: result.filePath,
            messages: result.messages.map(msg => ({
                ruleId: msg.ruleId || 'unknown',
                message: msg.message
            }))
        }));
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to run ESLint: ${message}`);
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
        } catch {
            // File not found or unreadable, treat as 0 LOC
            locMap[file] = 0;
        }
    }

    return locMap;
}

export async function writeOutputFiles(
    metricsPath: string,
    metricsData: unknown,
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
