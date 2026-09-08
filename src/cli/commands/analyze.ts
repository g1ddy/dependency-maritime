import { parseArgs } from 'node:util';
import * as path from 'node:path';
import { runEslintComplexityScan, countLinesOfCode } from '../analyze/adapters';
import { calculateMetrics, calculateNamespaceMetrics, isSupportedTypeScriptFile } from '../analyze/calculate-metrics';
import { parseEslintComplexityReport } from '../analyze/parse-eslint';
import { validateEslintEnvironment } from '../analyze/environment';
import { resolveAnalysisGraph } from '../analyze/graph-input';
import { evaluateArchitectureAnalysis } from '../analyze/architecture-analysis';
import { writeAnalysisOutputs } from '../analyze/output-manifest';
import { ValidationError, type AnalysisThresholds } from '../analyze/models';

const DEFAULT_THRESHOLDS: AnalysisThresholds = {
    loc: 300,
    complexity: 10,
    fanOut: 15
};

type AnalyzeValues = {
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

function parseAnalyzeArgs(args: string[]): AnalyzeValues | number {
    try {
        return parseArgs({
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
        }).values;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error parsing arguments: ${message}`);
        return 2;
    }
}

function printHelp(): void {
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
}

function validateAnalyzeMode(values: AnalyzeValues): number | undefined {
    if (values['write-baseline'] && (values.baseline || values['fail-on-new-violations'])) {
        console.error('Error: --write-baseline is an initialization mode and cannot be combined with --baseline or --fail-on-new-violations.');
        return 2;
    }
    if (values['fail-on-new-violations'] && !values.baseline) {
        console.error('Error: --fail-on-new-violations requires --baseline <file>.');
        return 2;
    }
    return undefined;
}

export async function runAnalyzeCommand(args: string[]): Promise<number> {
    const parsed = parseAnalyzeArgs(args);
    if (typeof parsed === 'number') return parsed;
    const values = parsed;

    if (values.help) {
        printHelp();
        return 0;
    }

    const invalidMode = validateAnalyzeMode(values);
    if (invalidMode !== undefined) return invalidMode;

    const workingDir = values.cwd ? path.resolve(values.cwd) : process.cwd();
    let targetGraphPath: string | undefined;
    let targetMetricsPath = values.metrics;
    let targetReportPath = values.report;

    if (values.output) {
        targetGraphPath = path.join(values.output, 'dependency-graph.json');
        targetMetricsPath ??= path.join(values.output, 'complexity-metrics.json');
        targetReportPath ??= path.join(values.output, 'complexity-report.md');
    }

    if (!targetMetricsPath || !targetReportPath) {
        console.error('Error: Either --output or both --metrics and --report must be specified.');
        return 2;
    }

    targetGraphPath ??= path.join(path.dirname(targetMetricsPath), 'dependency-graph.json');

    const rawSources = values.source?.length
        ? values.source.flatMap(source => source.split(',').map(item => item.trim())).filter(Boolean)
        : ['src'];
    const normalizedSources = rawSources.map(rawSource => {
        const relative = path.relative(workingDir, path.resolve(workingDir, rawSource)).replace(/\\/g, '/');
        return relative || '.';
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
        if (graphResult.stagedSuppliedGraph) console.log('   - Staging supplied graph into artifact directory...');
        if (graphResult.configSource) console.log(`   - Dependency-Cruiser Config Source: ${graphResult.configSource}`);

        const sourceFiles = graphResult.modules
            .map(module => module.source)
            .filter(source => normalizedSources.some(root => root === '.' || source === root || source.startsWith(`${root}/`)))
            .filter(isSupportedTypeScriptFile);

        console.log('   - Running ESLint for Complexity...');
        const eslintResults = await runEslintComplexityScan(rawSources, sourceFiles, workingDir);
        const complexityMap = parseEslintComplexityReport(eslintResults, workingDir);

        console.log('   - Counting Lines of Code...');
        const locMap = await countLinesOfCode(sourceFiles, workingDir);

        const architecture = await evaluateArchitectureAnalysis({
            violations: graphResult.violations,
            modules: graphResult.modules,
            baselinePath: values.baseline,
            writeBaselinePath: values['write-baseline'],
            failOnNewViolations: values['fail-on-new-violations'],
            baseRevision: values.base,
            workingDir
        });

        console.log('   - Aggregating Metrics...');
        const analysisResult = calculateMetrics(
            graphResult.modules,
            locMap,
            complexityMap,
            DEFAULT_THRESHOLDS,
            normalizedSources
        );
        const namespaceMetrics = calculateNamespaceMetrics(graphResult.modules);

        console.log(`   - Skipped / Unmeasured Source Files: ${analysisResult.skippedCount}`);
        if (analysisResult.skippedCount > 0) {
            console.warn(`⚠️ Warning: ${analysisResult.skippedCount} graph source file(s) were skipped or ignored by ESLint and could not be measured:`);
            analysisResult.unmeasuredFiles.forEach(file => console.warn(`   - ${file}`));
            if (values['fail-on-unmeasured']) {
                throw new ValidationError(
                    `Analysis failed because ${analysisResult.skippedCount} graph source file(s) were not scanned by ESLint (--fail-on-unmeasured).`
                );
            }
        }

        await writeAnalysisOutputs({
            analysisResult,
            thresholds: DEFAULT_THRESHOLDS,
            normalizedSources,
            effectiveGraphPath: graphResult.effectiveGraphPath,
            targetMetricsPath,
            targetReportPath,
            manifestDir,
            workingDir,
            debtEvaluation: architecture.debtEvaluation,
            impactEvaluation: architecture.impactEvaluation,
            namespaceMetrics
        });

        console.log('✅ Complexity Report Updated and Metrics Exported!');
        return 0;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error analyzing project: ${message}`);
        return e instanceof ValidationError ? 2 : 1;
    }
}
