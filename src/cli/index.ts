import { runAnalyzeCommand } from './commands/analyze';
import { runValidateCommand } from './commands/validate';
import { runGraphCommand } from './commands/graph';
import { validateArtifacts } from './validate/validate';

export { runAnalyzeCommand, runValidateCommand, runGraphCommand, validateArtifacts };
export { renderDependencyGraphToDot, resolveGraphPresentation, inferGraphvizFormat, DEFAULT_GRAPH_PRESENTATION, DEFAULT_GRAPH_PROFILE, GRAPH_PRESENTATION_PROFILES, EXTERNAL_PACKAGE_MODES, FOLDER_GROUPING_MODES, EDGE_LABEL_MODES, LAYOUT_DIRECTION_MODES, RANK_CONSTRAINT_MODES, LAYOUT_DENSITY_MODES, GRAPH_PROFILE_MODES } from './graph/render-dot';
export type { GraphPresentationOptions, ResolvedGraphPresentation, ExternalPackagesMode, FolderGroupingMode, EdgeLabelsMode, LayoutDirectionMode, RankConstraintMode, LayoutDensityMode, GraphProfileMode } from './graph/render-dot';
export { renderDotWithGraphviz, normalizeGraphvizSvg } from './graph/render-graphviz';
export * from '../schema/manifest';
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

export async function validateProject(options: {
    artifactDir?: string;
    cwd?: string;
} = {}): Promise<number> {
    const args: string[] = [];
    if (options.artifactDir) {
        args.push(options.artifactDir);
    }
    if (options.cwd) {
        args.push('--cwd', options.cwd);
    }
    return runValidateCommand(args);
}
