import { parseArgs } from 'node:util';
import {
    runEslintComplexityScan,
    countLinesOfCode,
    writeOutputFiles,
    getToolVersion
} from '../analyze/adapters';
import { calculateMetrics, calculateNamespaceMetrics, isSupportedTypeScriptFile } from '../analyze/calculate-metrics';
import { parseEslintComplexityReport } from '../analyze/parse-eslint';
import { renderMarkdownReport } from '../analyze/render-markdown-report';
import { validateEslintEnvironment } from '../analyze/environment';
import { ValidationError, type AnalysisThresholds } from '../analyze/models';
import { MANIFEST_SCHEMA_VERSION, type ArtifactManifest } from '../../schema/manifest';
import { readBaselineFile, writeBaselineFile, evaluateArchitectureDebt } from '../analyze/architecture-debt';
import { calculateChangeImpact, type ImpactAnalysisResult } from '../analyze/impact';
import { resolveAnalysisGraph } from '../analyze/graph-input';
import * as path from 'node:path';

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
        'write-baseline'?: string;
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
                'write-baseline': { type: 'string' },
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
  --output <dir>               Output directory for all generated artifacts (e.g. .maritime)
  --source <dir>               Source directory/directories to analyze (repeatable or comma-separated, default: "src")
  --graph <file>               Dependency graph JSON file path (input if file exists; output if generated)
  --metrics <file>             Output JSON file for complexity metrics
  --report <file>              Output Markdown file for complexity report
  --depcruise-config <file>    Optional path to repository dependency-cruiser configuration
  --cwd <dir>                  Working directory root for resolution
  --fail-on-unmeasured         Fail if any graph source file is skipped/unmeasured by ESLint
  --baseline <file>            Path to existing architecture debt baseline JSON
  --write-baseline <file>      Establish a baseline from current architecture violations
  --fail-on-new-violations     Fail analysis if new architecture violations are introduced relative to --baseline
  --base <revision>            Calculate PR change impact surface relative to Git base revision (e.g. main)

Baseline modes:
  Establish: maritime analyze --source src --output .maritime --write-baseline .maritime/baseline.json
  Enforce:   maritime analyze --source src --output .maritime --baseline .maritime/baseline.json --fail-on-new-violations

  --write-baseline cannot be combined with --baseline or --fail-on-new-violations.
  --fail-on-new-violations requires --baseline.

Examples:
  maritime analyze --source app --output .maritime
  maritime analyze --source app --output .maritime --base origin/main

Exit Codes:
  0 - Successful analysis
  1 - Operational or runtime failure
  2 - Invalid CLI arguments, environment, or invalid input artifact/schema
        `);
        return 0;
    }

    if (values['write-baseline'] && (values.baseline || values['fail-on-new-violations'])) {
        console.error('Error: --write-baseline is an initialization mode and cannot be combined with --baseline or --fail-on-new-violations.');
        return 2;
    }

    if (values['fail-on-new-violations'] && !values.baseline) {
        console.error('Error: --fail-on-new-violations requires --baseline <file>.');
        return 2;
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

        console.log(values.graph
            ? '   - Reading and normalizing supplied Dependency Cruiser JSON...'
            : '   - Generating Dependency Graph with dependency-cruiser...');

        const graphResult = await resolveAnalysisGraph({
            suppliedGraphPath: values.graph,
            targetGraphPath,
            manifestDir,
            rawSources,
            depcruiseConfig: values['depcruise-config'],
            workingDir
        });

        if (graphResult.configSource) {
            console.log(`   - Dependency-Cruiser Config Source: ${graphResult.configSource}`);
        }

        const modules = graphResult.modules;
        const cruiseSummaryViolations = graphResult.violations;
        const effectiveGraphPath = graphResult.effectiveGraphPath;

        const sourceFiles = modules
            .map(m => m.source)
            .filter(src => {
                const isSource = normalizedSources.some(norm => {
                    if (norm === '.') return true;
                    return src === norm || src.startsWith(`${norm}/`);
                });
                return isSource && isSupportedTypeScriptFile(src);
            });

        console.log('   - Running ESLint for Complexity...');
        const eslintResults = await runEslintComplexityScan(rawSources, sourceFiles, workingDir);
        const complexityMap = parseEslintComplexityReport(eslintResults, workingDir);

        console.log('   - Counting Lines of Code...');
        const locMap = await countLinesOfCode(sourceFiles, workingDir);

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

        if (values['write-baseline']) {
            console.log(`   - Writing Architecture Debt baseline to: ${values['write-baseline']}`);
            await writeBaselineFile(values['write-baseline'], cruiseSummaryViolations, workingDir);
        }

        let impactEvaluation: ImpactAnalysisResult | undefined;
        if (values.base) {
            console.log(`   - Evaluating PR Change Impact relative to base revision: ${values.base}`);
            impactEvaluation = calculateChangeImpact(modules, {
                baseRevision: values.base,
                cwd: workingDir
            });
        }

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
                gitChangedCount: impactEvaluation.gitChangedFiles.length,
                directlyChangedGraphCount: impactEvaluation.directlyChangedFiles.length,
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
                        gitChangedCount: impactEvaluation.gitChangedFiles.length,
                        directlyChangedGraphCount: impactEvaluation.directlyChangedFiles.length,
                        transitiveImpactCount: impactEvaluation.transitivelyAffectedFiles.length,
                        affectedFolderCount: impactEvaluation.affectedFolders.length,
                        impactRatio: impactEvaluation.impactRatio
                    }
                } : {}),
                architecture: {
                    namespaces: namespaceMetrics
                }
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
