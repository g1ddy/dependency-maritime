import * as fs from 'fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'path';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { ValidationError, type DependencyCruiserModule, type EslintResult } from './models';

export interface ResolvedDepcruiseConfig {
    config: Record<string, unknown>;
    configPath: string | null;
    source: 'explicit' | 'discovered' | 'fallback';
}

export function getPortableFallbackConfig(cwd: string = process.cwd()): { options: Record<string, unknown> } {
    const options: Record<string, unknown> = {
        doNotFollow: {
            path: 'node_modules'
        },
        tsPreCompilationDeps: true,
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'node', 'default']
        }
    };

    const tsConfigApp = path.resolve(cwd, 'tsconfig.app.json');
    const tsConfigDefault = path.resolve(cwd, 'tsconfig.json');

    try {
        if (existsSync(tsConfigApp)) {
            options.tsConfig = { fileName: './tsconfig.app.json' };
        } else if (existsSync(tsConfigDefault)) {
            options.tsConfig = { fileName: './tsconfig.json' };
        }
    } catch {
        // Ignore filesystem check errors
    }

    return { options };
}

export async function resolveDepcruiseConfig(
    configPath?: string,
    cwd: string = process.cwd()
): Promise<ResolvedDepcruiseConfig> {
    if (configPath) {
        const absConfigPath = path.resolve(cwd, configPath);
        if (!existsSync(absConfigPath)) {
            throw new ValidationError(`Specified dependency-cruiser configuration file not found at ${configPath}`);
        }
        try {
            const extractDepcruiseConfigModule = await import('dependency-cruiser/config-utl/extract-depcruise-config');
            const extractDepcruiseConfig = extractDepcruiseConfigModule.default || extractDepcruiseConfigModule;
            const config = await extractDepcruiseConfig(absConfigPath);
            return {
                config: config as Record<string, unknown>,
                configPath: absConfigPath,
                source: 'explicit'
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new ValidationError(`Failed to load specified dependency-cruiser configuration at ${configPath}: ${message}`);
        }
    }

    const conventionalFiles = [
        '.dependency-cruiser.cjs',
        '.dependency-cruiser.js',
        '.dependency-cruiser.mjs',
        '.dependency-cruiser.json'
    ];

    for (const fileName of conventionalFiles) {
        const candidate = path.resolve(cwd, fileName);
        if (existsSync(candidate)) {
            try {
                const extractDepcruiseConfigModule = await import('dependency-cruiser/config-utl/extract-depcruise-config');
                const extractDepcruiseConfig = extractDepcruiseConfigModule.default || extractDepcruiseConfigModule;
                const config = await extractDepcruiseConfig(candidate);
                return {
                    config: config as Record<string, unknown>,
                    configPath: candidate,
                    source: 'discovered'
                };
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new ValidationError(`Failed to load discovered dependency-cruiser configuration at ${fileName}: ${message}`);
            }
        }
    }

    return {
        config: getPortableFallbackConfig(cwd),
        configPath: null,
        source: 'fallback'
    };
}

export interface GenerateDependencyGraphOptions {
    sourceRoots: string[];
    configPath?: string;
    cwd?: string;
}

export interface GenerateDependencyGraphResult {
    cruiseResult: unknown;
    modules: DependencyCruiserModule[];
    configSource: 'explicit' | 'discovered' | 'fallback';
}

export async function generateDependencyGraph(
    options: GenerateDependencyGraphOptions
): Promise<GenerateDependencyGraphResult> {
    const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
    const resolvedConfig = await resolveDepcruiseConfig(options.configPath, cwd);

    const prevCwd = process.cwd();
    let cruiseResultRaw: unknown;

    try {
        process.chdir(cwd);

        const { cruise } = await import('dependency-cruiser');
        const rawOptions = (resolvedConfig.config.options as Record<string, unknown> | undefined) || {};
        const cruiseOptions: Record<string, unknown> = { ...rawOptions };

        if (resolvedConfig.config.forbidden || resolvedConfig.config.allowed || resolvedConfig.config.required) {
            cruiseOptions.ruleSet = resolvedConfig.config;
        }

        const cruiseOutput = await cruise(options.sourceRoots, cruiseOptions);
        cruiseResultRaw = cruiseOutput.output;
    } catch (err: unknown) {
        if (err instanceof ValidationError) {
            throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to generate dependency graph: ${message}`);
    } finally {
        process.chdir(prevCwd);
    }

    const validationResult = CruiseResultSchema.safeParse(cruiseResultRaw);
    if (!validationResult.success) {
        throw new ValidationError(`Generated dependency graph failed schema validation:\n${validationResult.error.message}`);
    }

    const modules: DependencyCruiserModule[] = validationResult.data.modules.map(m => ({
        source: m.source,
        dependencies: m.dependencies,
        dependents: m.dependents
    }));

    return {
        cruiseResult: validationResult.data,
        modules,
        configSource: resolvedConfig.source
    };
}

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
    sourcePath: string | string[],
    sourceFiles?: string[],
    cwd: string = process.cwd()
): Promise<EslintResult[]> {
    let eslintModule: typeof import('eslint');
    try {
        eslintModule = await import('eslint');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new ValidationError(`ESLint is not installed in ${cwd}: ${message}. Maritime requires ESLint 9+ as a peer dependency.`);
    }
    const ESLint = eslintModule.ESLint;

    const rawPaths = Array.isArray(sourcePath) ? sourcePath : [sourcePath];
    const globPatterns = rawPaths.map(p => `${path.resolve(cwd, p).replace(/\\/g, '/') }/**/*.{ts,tsx}`);

    const hasExplicitFiles = sourceFiles !== undefined;
    let targets: string[];
    if (hasExplicitFiles) {
        targets = sourceFiles.map(f => path.resolve(cwd, f).replace(/\\/g, '/'));
    } else {
        targets = globPatterns;
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
            if (hasExplicitFiles) {
                try {
                    // Check if file exists on disk (only for explicit file targets, not glob patterns)
                    await fs.access(t);
                } catch {
                    // Stale path (file no longer exists on disk), represent as unmeasured/ignored
                    ignoredResults.push({
                        filePath: t,
                        ignored: true,
                        messages: []
                    });
                    continue;
                }
            }

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

        const lintResults: EslintResult[] = [];
        if (unignoredTargets.length > 0) {
            if (hasExplicitFiles) {
                for (const targetFile of unignoredTargets) {
                    try {
                        const rawResults = await eslint.lintFiles([targetFile]);
                        for (const result of rawResults) {
                            lintResults.push({
                                filePath: result.filePath,
                                ignored: Boolean((result as { ignored?: boolean }).ignored),
                                messages: result.messages.map(msg => ({
                                    ruleId: typeof msg.ruleId === 'string' ? msg.ruleId : 'unknown',
                                    message: msg.message,
                                    fatal: Boolean((msg as { fatal?: boolean }).fatal)
                                }))
                            });
                        }
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : String(err);
                        if (message.includes('No files matching') || message.includes('are ignored') || message.includes('All files matched')) {
                            ignoredResults.push({
                                filePath: targetFile,
                                ignored: true,
                                messages: []
                            });
                        } else {
                            throw err;
                        }
                    }
                }
            } else {
                const rawResults = await eslint.lintFiles(unignoredTargets);
                for (const result of rawResults) {
                    lintResults.push({
                        filePath: result.filePath,
                        ignored: Boolean((result as { ignored?: boolean }).ignored),
                        messages: result.messages.map(msg => ({
                            ruleId: typeof msg.ruleId === 'string' ? msg.ruleId : 'unknown',
                            message: msg.message,
                            fatal: Boolean((msg as { fatal?: boolean }).fatal)
                        }))
                    });
                }
            }
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
