import { runAnalyzeCommand } from './commands/analyze';

export { runAnalyzeCommand };
export {
    readDependencyGraph,
    resolveDepcruiseConfig,
    generateDependencyGraph,
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
    graph?: string;
    metrics?: string;
    report?: string;
    output?: string;
    depcruiseConfig?: string;
    source?: string | string[];
    cwd?: string;
    failOnUnmeasured?: boolean;
}): Promise<number> {
    const args: string[] = [];
    if (options.graph) {
        args.push('--graph', options.graph);
    }
    if (options.metrics) {
        args.push('--metrics', options.metrics);
    }
    if (options.report) {
        args.push('--report', options.report);
    }
    if (options.output) {
        args.push('--output', options.output);
    }
    if (options.depcruiseConfig) {
        args.push('--depcruise-config', options.depcruiseConfig);
    }
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
