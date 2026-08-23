import { parseArgs } from 'node:util';
import {
    readDependencyGraph,
    runEslintComplexityScan,
    countLinesOfCode,
    writeOutputFiles
} from '../analyze/adapters';
import { calculateMetrics } from '../analyze/calculate-metrics';
import { parseEslintComplexityReport } from '../analyze/parse-eslint';
import { renderMarkdownReport } from '../analyze/render-markdown-report';
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
Usage: maritime analyze --graph <file> --metrics <file> --report <file> [--source <dir>]

Options:
  --graph <file>     Input dependency-cruiser JSON
  --metrics <file>   Output JSON file for metrics
  --report <file>    Output Markdown file for the report
  --source <dir>     Source directory to analyze (default: "src")

Note: analyze consumes a dependency graph; it does not generate one.

Exit Codes:
  0 - Successful analysis
  1 - Operational or runtime failure
  2 - Invalid CLI arguments or invalid input artifact/schema
        `);
        return 0;
    }

    if (!values.graph || !values.metrics || !values.report) {
        console.error('Error: --graph, --metrics, and --report are required.');
        return 2;
    }

    try {

        console.log('📊 Starting Complexity Analysis...');

        // 1. Read input graph
        console.log('   - Reading Dependency Cruiser JSON...');
        const modules = await readDependencyGraph(values.graph);

        const rawSource = values.source || 'src';

        // 2. ESLint for complexity
        console.log('   - Running ESLint for Complexity...');
        const eslintResults = await runEslintComplexityScan(rawSource);
        const complexityMap = parseEslintComplexityReport(eslintResults, process.cwd());

        // Convert to a repo-relative path, replacing backslashes with forward slashes
        // This handles absolute paths, './src', 'src/', etc., cleanly relative to cwd
        let normalizedSource = path.relative(process.cwd(), path.resolve(process.cwd(), rawSource)).replace(/\\/g, '/');
        if (normalizedSource === '') normalizedSource = '.';

        // 3. Count LOC
        console.log('   - Counting Lines of Code...');

        // Match paths similarly to calculate-metrics boundary logic
        const prefixBoundary = normalizedSource === '.' ? '' : `${normalizedSource}/`;

        const sourceFiles = modules
            .map(m => m.source)
            .filter(src => {
                return normalizedSource === '.'
                    ? true
                    : src === normalizedSource || src.startsWith(prefixBoundary);
            });

        const locMap = await countLinesOfCode(sourceFiles);

        // 4. Calculate metrics
        console.log('   - Aggregating Metrics...');
        const analysisResult = calculateMetrics(
            modules,
            locMap,
            complexityMap,
            DEFAULT_THRESHOLDS,
            normalizedSource
        );

        // 5. Generate metrics and report
        console.log('   - Generating Outputs...');

        // Match the previous script's output format: simple Record<string, FileMetric> for --metrics
        const metricsMap = analysisResult.files.reduce((acc, f) => {
            acc[f.file] = {
                complexity: f.complexity,
                loc: f.loc,
                instability: f.instability,
                fanIn: f.fanIn,
                fanOut: f.fanOut
            };
            return acc;
        }, {} as Record<string, unknown>);

        const reportContent = renderMarkdownReport(analysisResult, DEFAULT_THRESHOLDS);

        await writeOutputFiles(values.metrics, metricsMap, values.report, reportContent);

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
