import { runAnalyzeCommand } from './commands/analyze';

export { runAnalyzeCommand };
export {
    readDependencyGraph,
    runEslintComplexityScan,
    countLinesOfCode,
    writeOutputFiles
} from './analyze/adapters';
export {
    calculateMetrics,
    isSupportedTypeScriptFile,
    calculateInstability,
    calculateScore,
    calculateHealthScore
} from './analyze/calculate-metrics';
export { parseEslintComplexityReport } from './analyze/parse-eslint';
export { renderMarkdownReport } from './analyze/render-markdown-report';
export {
    validateEslintEnvironment,
    validateNodeVersion,
    detectEslintConfig
} from './analyze/environment';
export * from './analyze/models';

export async function analyzeProject(options: {
    graph: string;
    metrics: string;
    report: string;
    source?: string | string[];
    cwd?: string;
    failOnUnmeasured?: boolean;
}): Promise<number> {
    const args: string[] = [
        '--graph', options.graph,
        '--metrics', options.metrics,
        '--report', options.report
    ];
    if (options.cwd) {
        args.push('--cwd', options.cwd);
    }
    if (options.failOnUnmeasured) {
        args.push('--fail-on-unmeasured');
    }
    if (options.source) {
        const sources = Array.isArray(options.source) ? options.source : [options.source];
        for (const s of sources) {
            args.push('--source', s);
        }
    }
    return runAnalyzeCommand(args);
}
