import * as fs from 'fs/promises';
import * as path from 'path';
import { ESLint } from 'eslint';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { ValidationError, type DependencyCruiserModule, type EslintResult } from './models';

export async function readDependencyGraph(
    graphPath: string,
    cwd: string = process.cwd()
): Promise<DependencyCruiserModule[]> {
    const absolutePath = path.resolve(cwd, graphPath);
    let data: string;
    let parsed: unknown;

    try {
        data = await fs.readFile(absolutePath, 'utf8');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to read dependency graph at ${graphPath}: ${message}`);
    }

    try {
        parsed = JSON.parse(data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
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

export async function runEslintComplexityScan(
    sourcePath: string,
    sourceFiles?: string[],
    cwd: string = process.cwd()
): Promise<EslintResult[]> {
    const target = path.resolve(cwd, sourcePath).replace(/\\/g, '/');
    const globPattern = `${target}/**/*.{ts,tsx}`;

    let targets: string[];
    if (sourceFiles && sourceFiles.length > 0) {
        targets = sourceFiles.map(f => path.resolve(cwd, f).replace(/\\/g, '/'));
    } else {
        targets = [globPattern];
    }

    try {
        const eslint = new ESLint({
            cwd,
            overrideConfig: [{
                rules: {
                    'complexity': ['warn', 0]
                }
            }]
        });

        const unignoredTargets: string[] = [];
        const ignoredResults: EslintResult[] = [];

        for (const t of targets) {
            // Check if ESLint flat config ignores this path
            const isIgnored = await eslint.isPathIgnored(t);
            if (isIgnored) {
                ignoredResults.push({
                    filePath: t,
                    ignored: true,
                    messages: []
                });
            } else {
                unignoredTargets.push(t);
            }
        }

        let lintResults: EslintResult[] = [];
        if (unignoredTargets.length > 0) {
            const rawResults = await eslint.lintFiles(unignoredTargets);
            lintResults = rawResults.map(result => ({
                filePath: result.filePath,
                ignored: Boolean((result as { ignored?: boolean }).ignored),
                messages: result.messages.map(msg => ({
                    ruleId: typeof msg.ruleId === 'string' ? msg.ruleId : 'unknown',
                    message: msg.message
                }))
            }));
        }

        return [...lintResults, ...ignoredResults];
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes('All files matched') && message.includes('are ignored')) {
            return targets.map(t => ({
                filePath: t,
                ignored: true,
                messages: []
            }));
        }

        throw new Error(`Failed to run ESLint: ${message}`);
    }
}

export async function countLinesOfCode(
    sourceFiles: string[],
    cwd: string = process.cwd()
): Promise<Record<string, number>> {
    const locMap: Record<string, number> = {};

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
    reportData: string,
    cwd: string = process.cwd()
): Promise<void> {
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
