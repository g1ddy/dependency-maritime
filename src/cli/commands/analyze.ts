import { parseArgs } from 'node:util';
import {
    readDependencyGraph,
    runEslintComplexityScan,
    countLinesOfCode,
    writeOutputFiles
} from '../analyze/adapters';
import { calculateMetrics, isSupportedTypeScriptFile } from '../analyze/calculate-metrics';
import { parseEslintComplexityReport } from '../analyze/parse-eslint';
import { renderMarkdownReport } from '../analyze/render-markdown-report';
import { validateEslintEnvironment } from '../analyze/environment';
import { ValidationError, type AnalysisThresholds } from '../analyze/models';
import * as path from 'path';

const DEFAULT_THRESHOLDS: AnalysisThresholds = {
    loc: 300,
    complexity: 10,
    fanOut: 15
};

export async function runAnalyzeCommand(args: string[]): Promise<number> {
    let values: {
        source?: string;
        graph?: string;
        metrics?: string;
        report?: string;
        cwd?: string;
        'fail-on-unmeasured'?: boolean;
        help?: boolean;
    };

    try {
        const parsed = parseArgs({
            args,
            allowPositionals: true,
            options: {
                source: { type: 'string', default: 'src' },
                graph: { type: 'string' },
                metrics: { type: 'string' },
                report: { type: 'string' },
                cwd: { type: 'string' },
                'fail-on-unmeasured': { type: 'boolean', default: false },
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
Usage: maritime analyze --graph <file> --metrics <file> --report <file> [--source <dir>] [--cwd <dir>] [--fail-on-unmeasured]

Options:
  --graph <file>            Input dependency-cruiser JSON
  --metrics <file>          Output JSON file for metrics
  --report <file>           Output Markdown file for the report
  --source <dir>            Source directory to analyze (default: "src")
  --cwd <dir>               Working directory root for resolution
  --fail-on-unmeasured      Fail if any graph source file is skipped/unmeasured by ESLint

Note: analyze consumes a dependency graph; it does not generate one.

Exit Codes:
  0 - Successful analysis
  1 - Operational or runtime failure
  2 - Invalid CLI arguments, environment, or invalid input artifact/schema
        `);
        return 0;
    }

    if (!values.graph || !values.metrics || !values.report) {
        console.error('Error: --graph, --metrics, and --report are required.');
        return 2;
    }

    const workingDir = values.cwd ? path.resolve(values.cwd) : process.cwd();
    const rawSource = values.source || 'src';

    // Convert to a repo-relative path, replacing backslashes with forward slashes
    let normalizedSource = path.relative(workingDir, path.resolve(workingDir, rawSource)).replace(/\\/g, '/');
    if (normalizedSource === '') normalizedSource = '.';

    try {
        console.log('📊 Starting Complexity Analysis...');

        // 1. Validate environment & ESLint flat config baseline
        console.log('   - Validating Environment & Configuration...');
        const { mode: eslintConfigMode } = validateEslintEnvironment(workingDir);

        console.log(`   - Working Directory: ${workingDir}`);
        console.log(`   - Source Root (raw): ${rawSource}`);
        console.log(`   - Source Root (normalized): ${normalizedSource}`);
        console.log(`   - Graph Path: ${values.graph}`);
        console.log(`   - ESLint Config Mode: ${eslintConfigMode}`);

        // 2. Read input graph
        console.log('   - Reading Dependency Cruiser JSON...');
        const modules = await readDependencyGraph(values.graph, workingDir);

        const prefixBoundary = normalizedSource === '.' ? '' : `${normalizedSource}/`;

        const sourceFiles = modules
            .map(m => m.source)
            .filter(src => {
                const isSource = normalizedSource === '.'
                    ? true
                    : src === normalizedSource || src.startsWith(prefixBoundary);
                return isSource && isSupportedTypeScriptFile(src);
            });

        // 3. ESLint for complexity
        console.log('   - Running ESLint for Complexity...');
        const eslintResults = await runEslintComplexityScan(rawSource, sourceFiles, workingDir);
        const complexityMap = parseEslintComplexityReport(eslintResults, workingDir);

        // 4. Count LOC
        console.log('   - Counting Lines of Code...');
        const locMap = await countLinesOfCode(sourceFiles, workingDir);

        // 5. Calculate metrics
        console.log('   - Aggregating Metrics...');
        const analysisResult = calculateMetrics(
            modules,
            locMap,
            complexityMap,
            DEFAULT_THRESHOLDS,
            normalizedSource
        );

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

        const reportContent = renderMarkdownReport(analysisResult, DEFAULT_THRESHOLDS);

        await writeOutputFiles(values.metrics, metricsMap, values.report, reportContent, workingDir);

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
