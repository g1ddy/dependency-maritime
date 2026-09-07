import { parseArgs } from 'node:util';
import * as fsPromises from 'node:fs/promises';
import {
    readDependencyGraph,
    generateDependencyGraph,
    runEslintComplexityScan,
    countLinesOfCode,
    writeOutputFiles,
    getToolVersion
} from '../analyze/adapters';
import { calculateMetrics, calculateNamespaceMetrics, isSupportedTypeScriptFile } from '../analyze/calculate-metrics';
import { parseEslintComplexityReport } from '../analyze/parse-eslint';
import { renderMarkdownReport } from '../analyze/render-markdown-report';
import { validateEslintEnvironment } from '../analyze/environment';
import { ValidationError, type AnalysisThresholds, type DependencyCruiserModule } from '../analyze/models';
import { MANIFEST_SCHEMA_VERSION, type ArtifactManifest } from '../../schema/manifest';
import { readBaselineFile, evaluateArchitectureDebt, type ViolationInput } from '../analyze/architecture-debt';
import { calculateChangeImpact, type ImpactAnalysisResult } from '../analyze/impact';
import * as path from 'path';

const DEFAULT_THRESHOLDS: AnalysisThresholds = {
    loc: 300,
    complexity: 10,
    fanOut: 15
};

export async function runAnalyzeCommand(args: string[]): Promise<number> {
    let values: {
        source?: string[];
        graph?: string;
        metrics?: string;
        report?: string;
        output?: string;
        'depcruise-config'?: string;
        cwd?: string;
        'fail-on-unmeasured'?: boolean;
        baseline?: string;
        'fail-on-new-violations'?: boolean;
        base?: string;
        help?: boolean;
    };

    try {
        const parsed = parseArgs({
            args,
            allowPositionals: true,
            options: {
                source: { type: 'string', multiple: true, default: ['src'] },
                graph: { type: 'string' },
                metrics: { type: 'string' },
                report: { type: 'string' },
                output: { type: 'string' },
                'depcruise-config': { type: 'string' },
                cwd: { type: 'string' },
                'fail-on-unmeasured': { type: 'boolean', default: false },
                baseline: { type: 'string' },
                'fail-on-new-violations': { type: 'boolean', default: false },
                base: { type: 'string' },
                help: { type: 'boolean', short: 'h' }
            }
        });
        values = parsed.values;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error parsing arguments: ${message}`);
        return 2;
    }

    if (values.help) {
        console.log(`
Usage: maritime analyze [options]

Options:
  --output <dir>            Output directory for all generated artifacts (e.g. .maritime)
  --source <dir>            Source directory/directories to analyze (repeatable or comma-separated, default: "src")
  --graph <file>            Dependency graph JSON file path (input if file exists; output if generated)
  --metrics <file>          Output JSON file for complexity metrics
  --report <file>           Output Markdown file for complexity report
  --depcruise-config <file> Optional path to repository dependency-cruiser configuration
  --cwd <dir>               Working directory root for resolution
  --fail-on-unmeasured      Fail if any graph source file is skipped/unmeasured by ESLint

Examples:
  # Concise generated-graph workflow:
  maritime analyze --source app --output .maritime

  # Explicit pre-generated graph workflow:
  maritime analyze --source app --graph artifacts/dependency-graph.json --metrics metrics.json --report report.md

Exit Codes:
  0 - Successful analysis
  1 - Operational or runtime failure
  2 - Invalid CLI arguments, environment, or invalid input artifact/schema
        `);
        return 0;
    }

    const workingDir = values.cwd ? path.resolve(values.cwd) : process.cwd();

    let targetGraphPath = values.graph;
    let targetMetricsPath = values.metrics;
    let targetReportPath = values.report;

    if (values.output) {
        targetGraphPath = targetGraphPath ?? path.join(values.output, 'dependency-graph.json');
        targetMetricsPath = targetMetricsPath ?? path.join(values.output, 'complexity-metrics.json');
        targetReportPath = targetReportPath ?? path.join(values.output, 'complexity-report.md');
    }

    if (!targetMetricsPath || !targetReportPath) {
        console.error('Error: Either --output or both --metrics and --report must be specified.');
        return 2;
    }

    if (!targetGraphPath) {
        targetGraphPath = 'dependency-graph.json';
    }

    const rawSources = (values.source && values.source.length > 0)
        ? values.source.flatMap(s => s.split(',').map(item => item.trim())).filter(Boolean)
        : ['src'];

    const normalizedSources = rawSources.map(rawSrc => {
        let norm = path.relative(workingDir, path.resolve(workingDir, rawSrc)).replace(/\\/g, '/');
        if (norm === '') norm = '.';
        return norm;
    });

    try {
        console.log('📊 Starting Complexity Analysis...');

        // 1. Validate environment & ESLint flat config baseline
        console.log('   - Validating Environment & Configuration...');
        const { mode: eslintConfigMode } = validateEslintEnvironment(workingDir);

        console.log(`   - Working Directory: ${workingDir}`);
        console.log(`   - Source Root (raw): ${rawSources.join(', ')}`);
        console.log(`   - Source Root (normalized): ${normalizedSources.join(', ')}`);
        console.log(`   - Graph Path: ${targetGraphPath}`);
        console.log(`   - ESLint Config Mode: ${eslintConfigMode}`);

        const manifestDir = values.output
            ? path.resolve(workingDir, values.output)
            : path.dirname(path.resolve(workingDir, targetMetricsPath));

        // 2. Read or generate graph & Extract violations
        let modules: DependencyCruiserModule[];
        const isGraphSupplied = values.graph !== undefined;
        let effectiveGraphPath: string;
        let cruiseSummaryViolations: ViolationInput[] = [];

        if (isGraphSupplied) {
            console.log('   - Reading Supplied Dependency Cruiser JSON...');
            modules = await readDependencyGraph(values.graph!, workingDir);

            const absGraphPath = path.resolve(workingDir, values.graph!);
            const relGraphToManifest = path.relative(manifestDir, absGraphPath);
            const isOutside = relGraphToManifest.startsWith('..') || path.isAbsolute(relGraphToManifest);

            if (isOutside) {
                console.log('   - Staging supplied graph into artifact directory...');
                effectiveGraphPath = path.join(manifestDir, path.basename(absGraphPath));
                try {
                    await fsPromises.mkdir(manifestDir, { recursive: true });
                    await fsPromises.copyFile(absGraphPath, effectiveGraphPath);
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    throw new Error(`Failed to stage supplied dependency graph into artifact directory: ${message}`);
                }
            } else {
                effectiveGraphPath = absGraphPath;
            }
        } else {
            console.log('   - Generating Dependency Graph with dependency-cruiser...');
            const genResult = await generateDependencyGraph({
                sourceRoots: rawSources,
                configPath: values['depcruise-config'],
                cwd: workingDir
            });
            console.log(`   - Dependency-Cruiser Config Source: ${genResult.configSource}`);
            modules = genResult.modules;

            const cruiseRes = genResult.cruiseResult as { summary?: { violations?: ViolationInput[] } };
            if (cruiseRes.summary && Array.isArray(cruiseRes.summary.violations)) {
                cruiseSummaryViolations = cruiseRes.summary.violations;
            }

            // Write the generated graph to targetGraphPath
            effectiveGraphPath = path.resolve(workingDir, targetGraphPath);
            await fsPromises.mkdir(path.dirname(effectiveGraphPath), { recursive: true });
            await fsPromises.writeFile(effectiveGraphPath, JSON.stringify(genResult.cruiseResult, null, 2));
        }

        const sourceFiles = modules
            .map(m => m.source)
            .filter(src => {
                const isSource = normalizedSources.some(norm => {
                    if (norm === '.') return true;
                    return src === norm || src.startsWith(`${norm}/`);
                });
                return isSource && isSupportedTypeScriptFile(src);
            });

        // 3. ESLint for complexity
        console.log('   - Running ESLint for Complexity...');
        const eslintResults = await runEslintComplexityScan(rawSources, sourceFiles, workingDir);
        const complexityMap = parseEslintComplexityReport(eslintResults, workingDir);

        // 4. Count LOC
        console.log('   - Counting Lines of Code...');
        const locMap = await countLinesOfCode(sourceFiles, workingDir);

        // 5. Architecture Debt Evaluation
        let debtEvaluation;
        if (values.baseline) {
            console.log(`   - Evaluating Architecture Debt against baseline: ${values.baseline}`);
            const baselineData = await readBaselineFile(values.baseline, workingDir);
            debtEvaluation = evaluateArchitectureDebt(cruiseSummaryViolations, baselineData);
        } else if (cruiseSummaryViolations.length > 0) {
            debtEvaluation = evaluateArchitectureDebt(cruiseSummaryViolations);
        }

        if (debtEvaluation && values['fail-on-new-violations'] && debtEvaluation.newViolationCount > 0) {
            throw new ValidationError(
                `Analysis failed because ${debtEvaluation.newViolationCount} new architecture violation(s) were introduced (--fail-on-new-violations).`
            );
        }

        // 6. PR / Change Impact Evaluation
        let impactEvaluation: ImpactAnalysisResult | undefined;
        if (values.base) {
            console.log(`   - Evaluating PR Change Impact relative to base revision: ${values.base}`);
            impactEvaluation = calculateChangeImpact(modules, {
                baseRevision: values.base,
                cwd: workingDir
            });
        }

        // 7. Calculate metrics
        console.log('   - Aggregating Metrics...');
        const analysisResult = calculateMetrics(
            modules,
            locMap,
            complexityMap,
            DEFAULT_THRESHOLDS,
            normalizedSources
        );

        const namespaceMetrics = calculateNamespaceMetrics(modules);

        console.log(`   - Skipped / Unmeasured Source Files: ${analysisResult.skippedCount}`);

        if (analysisResult.skippedCount > 0) {
            console.warn(`⚠️ Warning: ${analysisResult.skippedCount} graph source file(s) were skipped or ignored by ESLint and could not be measured:`);
            analysisResult.unmeasuredFiles.forEach(f => console.warn(`   - ${f}`));

            if (values['fail-on-unmeasured']) {
                throw new ValidationError(
                    `Analysis failed because ${analysisResult.skippedCount} graph source file(s) were not scanned by ESLint (--fail-on-unmeasured).`
                );
            }
        }

        // 6. Generate metrics and report
        console.log('   - Generating Outputs...');

        const metricsMap = analysisResult.files.reduce((acc, f) => {
            acc[f.file] = {
                complexity: f.complexity,
                loc: f.loc,
                instability: f.instability,
                fanIn: f.fanIn,
                fanOut: f.fanOut,
                scanned: f.scanned
            };
            return acc;
        }, {} as Record<string, unknown>);

        const reportContent = renderMarkdownReport(
            analysisResult,
            DEFAULT_THRESHOLDS,
            new Date(),
            debtEvaluation ? {
                baselineCount: debtEvaluation.baselineCount,
                existingDebtCount: debtEvaluation.existingDebtCount,
                newViolationCount: debtEvaluation.newViolationCount,
                resolvedCount: debtEvaluation.resolvedCount
            } : undefined,
            impactEvaluation ? {
                baseRevision: impactEvaluation.baseRevision,
                directlyChangedCount: impactEvaluation.directlyChangedFiles.length,
                transitiveImpactCount: impactEvaluation.transitivelyAffectedFiles.length,
                affectedFolderCount: impactEvaluation.affectedFolders.length,
                impactRatio: impactEvaluation.impactRatio
            } : undefined,
            namespaceMetrics
        );

        const targetManifestPath = path.relative(workingDir, path.join(manifestDir, 'manifest.json')).replace(/\\/g, '/');

        const relGraph = path.relative(manifestDir, effectiveGraphPath).replace(/\\/g, '/');
        const relMetrics = path.relative(manifestDir, path.resolve(workingDir, targetMetricsPath)).replace(/\\/g, '/');
        const relReport = path.relative(manifestDir, path.resolve(workingDir, targetReportPath)).replace(/\\/g, '/');

        const artifactRelPaths = { graph: relGraph, metrics: relMetrics, report: relReport };
        for (const [key, relPath] of Object.entries(artifactRelPaths)) {
            if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
                throw new ValidationError(`Manifest artifact path for "${key}" escapes the artifact directory: "${relPath}"`);
            }
        }

        const manifest: ArtifactManifest = {
            schemaVersion: MANIFEST_SCHEMA_VERSION,
            toolVersion: getToolVersion(),
            generatedAt: new Date().toISOString(),
            sourceRoots: normalizedSources,
            artifacts: {
                graph: relGraph,
                metrics: relMetrics,
                report: relReport
            },
            summary: {
                totalFiles: analysisResult.files.length,
                healthScore: analysisResult.healthScore,
                scannedCount: analysisResult.files.filter(f => f.scanned).length,
                skippedCount: analysisResult.skippedCount,
                ...(debtEvaluation ? {
                    architectureDebt: {
                        baselineCount: debtEvaluation.baselineCount,
                        existingDebtCount: debtEvaluation.existingDebtCount,
                        newViolationCount: debtEvaluation.newViolationCount,
                        resolvedCount: debtEvaluation.resolvedCount
                    }
                } : {}),
                ...(impactEvaluation ? {
                    changeImpact: {
                        baseRevision: impactEvaluation.baseRevision,
                        directlyChangedCount: impactEvaluation.directlyChangedFiles.length,
                        transitiveImpactCount: impactEvaluation.transitivelyAffectedFiles.length,
                        affectedFolderCount: impactEvaluation.affectedFolders.length,
                        impactRatio: impactEvaluation.impactRatio
                    }
                } : {})
            }
        };

        await writeOutputFiles(
            targetMetricsPath,
            metricsMap,
            targetReportPath,
            reportContent,
            targetManifestPath,
            manifest,
            workingDir
        );

        console.log('✅ Complexity Report Updated and Metrics Exported!');
        return 0;

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error analyzing project: ${message}`);

        if (e instanceof ValidationError) {
            return 2;
        }
        return 1;
    }
}
