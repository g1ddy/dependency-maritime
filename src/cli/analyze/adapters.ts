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
        tsPreCompilationDeps: 'specify',
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
        '.dependency-cruiser.ts',
        '.dependency-cruiser.cts',
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
                    await fs.access(t);
                } catch {
                    ignoredResults.push({
                        filePath: t,
                        ignored: true,
                        messages: []
                    });
                    continue;
                }
            }

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
            locMap[file] = 0;
        }
    }

    return locMap;
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function getToolVersion(): string {
    try {
        const currentFile = fileURLToPath(import.meta.url);
        let currDir = path.dirname(currentFile);
        while (currDir) {
            const pkgPath = path.join(currDir, 'package.json');
            if (existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: unknown; version?: unknown };
                    if (pkg.name === '@dependency-maritime/cli' && typeof pkg.version === 'string') {
                        return pkg.version;
                    }
                } catch {
                    // Ignore parse errors and keep traversing up
                }
            }
            const parent = path.dirname(currDir);
            if (parent === currDir) break;
            currDir = parent;
        }
    } catch {
        // Fallback
    }
    return '0.0.0';
}

export async function writeOutputFiles(
    metricsPath: string,
    metricsData: unknown,
    reportPath: string,
    reportData: string,
    cwd?: string
): Promise<void>;
export async function writeOutputFiles(
    metricsPath: string,
    metricsData: unknown,
    reportPath: string,
    reportData: string,
    options?: { manifestPath?: string; manifestData?: unknown; cwd?: string }
): Promise<void>;
export async function writeOutputFiles(
    metricsPath: string,
    metricsData: unknown,
    reportPath: string,
    reportData: string,
    manifestPath?: string,
    manifestData?: unknown,
    cwd?: string
): Promise<void>;
export async function writeOutputFiles(
    metricsPath: string,
    metricsData: unknown,
    reportPath: string,
    reportData: string,
    arg5?: string | { manifestPath?: string; manifestData?: unknown; cwd?: string },
    arg6?: unknown,
    arg7?: string
): Promise<void> {
    let manifestPath: string | undefined;
    let manifestData: unknown;
    let cwd = process.cwd();

    if (typeof arg5 === 'object' && arg5 !== null) {
        manifestPath = arg5.manifestPath;
        manifestData = arg5.manifestData;
        if (arg5.cwd) {
            cwd = arg5.cwd;
        }
    } else if (typeof arg5 === 'string') {
        if (arg6 !== undefined) {
            manifestPath = arg5;
            manifestData = arg6;
            if (typeof arg7 === 'string') {
                cwd = arg7;
            }
        } else {
            cwd = arg5;
        }
    } else if (typeof arg7 === 'string') {
        cwd = arg7;
    }

    const absMetricsPath = path.resolve(cwd, metricsPath);
    const absReportPath = path.resolve(cwd, reportPath);

    await fs.mkdir(path.dirname(absMetricsPath), { recursive: true });
    await fs.mkdir(path.dirname(absReportPath), { recursive: true });

    const promises: Promise<void>[] = [
        fs.writeFile(absMetricsPath, JSON.stringify(metricsData, null, 2)),
        fs.writeFile(absReportPath, reportData)
    ];

    if (manifestPath && manifestData !== undefined) {
        const absManifestPath = path.resolve(cwd, manifestPath);
        await fs.mkdir(path.dirname(absManifestPath), { recursive: true });
        promises.push(fs.writeFile(absManifestPath, JSON.stringify(manifestData, null, 2)));
    }

    await Promise.all(promises);
}
