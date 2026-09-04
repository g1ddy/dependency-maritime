import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import {
    CLUSTER_RANKING_MODES,
    EDGE_LABEL_MODES,
    EDGE_PRESENTATION_MODES,
    EXTERNAL_PACKAGE_MODES,
    FOLDER_GROUPING_MODES,
    GRAPH_PROFILE_MODES,
    LAYOUT_DENSITY_MODES,
    LAYOUT_DIRECTION_MODES,
    MODULE_AGGREGATION_MODES,
    OUTPUT_ORDER_MODES,
    RANK_CONSTRAINT_MODES,
    SOURCE_ROOT_GROUPING_MODES,
    VISUAL_THEME_MODES,
    inferGraphvizFormat,
    renderDependencyGraphToDot,
    type ClusterRankingMode,
    type EdgeLabelsMode,
    type EdgePresentationMode,
    type ExternalPackagesMode,
    type FolderGroupingMode,
    type GraphProfileMode,
    type LayoutDensityMode,
    type LayoutDirectionMode,
    type ModuleAggregationMode,
    type OutputOrderMode,
    type RankConstraintMode,
    type SourceRootGroupingMode,
    type VisualThemeMode
} from '../graph/render-dot';
import { renderDotWithGraphviz } from '../graph/render-graphviz';
import { validateArtifacts } from '../validate/validate';

type GraphCommandValues = {
    input?: string; output?: string; cwd?: string; help?: boolean;
    'graph-profile'?: string; 'external-packages'?: string; 'folder-grouping'?: string; 'edge-labels'?: string;
    'layout-direction'?: string; 'rank-constraints'?: string; 'layout-density'?: string; 'module-aggregation'?: string;
    'visual-theme'?: string; 'source-root-grouping'?: string; 'edge-presentation'?: string; 'cluster-ranking'?: string;
    'output-order'?: string; 'aggregation-depth'?: string;
};

export async function runGraphCommand(args: string[]): Promise<number> {
    let values: GraphCommandValues;
    try {
        values = parseArgs({ args, options: {
            input: { type: 'string', short: 'i' }, output: { type: 'string', short: 'o' }, cwd: { type: 'string' }, help: { type: 'boolean', short: 'h' },
            'graph-profile': { type: 'string' }, 'external-packages': { type: 'string' }, 'folder-grouping': { type: 'string' }, 'edge-labels': { type: 'string' },
            'layout-direction': { type: 'string' }, 'rank-constraints': { type: 'string' }, 'layout-density': { type: 'string' }, 'module-aggregation': { type: 'string' },
            'visual-theme': { type: 'string' }, 'source-root-grouping': { type: 'string' }, 'edge-presentation': { type: 'string' }, 'cluster-ranking': { type: 'string' },
            'output-order': { type: 'string' }, 'aggregation-depth': { type: 'string' }
        } }).values;
    } catch (error) { console.error(`Error parsing arguments: ${error instanceof Error ? error.message : String(error)}`); return 2; }
    if (values.help) {
        console.log(`\nUsage: maritime graph --input <artifact-directory-or-graph.json> --output <graph.svg|graph.dot>\n\nOptions:\n  --graph-profile <default|local-architecture|compact-architecture|architecture-overview>\n  --external-packages <none|summary|direct>\n  --folder-grouping <none|top-level|nested>\n  --edge-labels <none|types>\n  --layout-direction <lr|tb>\n  --rank-constraints <all|intra-folder>\n  --layout-density <normal|compact>\n  --module-aggregation <none|folders>\n  --aggregation-depth <positive integer>\n  --visual-theme <standard|architecture>\n  --source-root-grouping <preserve|elide-single>\n  --edge-presentation <relations|semantic-pairs>\n  --cluster-ranking <global|local>\n  --output-order <default|edges-first|nodes-first>\n  --cwd <dir>\n  -h, --help\n`);
        return 0;
    }
    if (!values.output) { console.error('Error: --output is required.'); return 2; }
    const validatePolicy = <T extends string>(flag: string, value: string | undefined, allowed: readonly T[]): T | undefined => {
        if (value === undefined) return undefined;
        if ((allowed as readonly string[]).includes(value)) return value as T;
        throw new Error(`Invalid --${flag} value "${value}". Expected one of: ${allowed.join(', ')}.`);
    };
    const validatePositiveInteger = (flag: string, value: string | undefined): number | undefined => {
        if (value === undefined) return undefined;
        if (/^[1-9][0-9]*$/u.test(value)) return Number(value);
        throw new Error(`Invalid --${flag} value "${value}". Expected a positive integer.`);
    };
    let externalPackages: ExternalPackagesMode | undefined; let folderGrouping: FolderGroupingMode | undefined; let edgeLabels: EdgeLabelsMode | undefined;
    let layoutDirection: LayoutDirectionMode | undefined; let rankConstraints: RankConstraintMode | undefined; let layoutDensity: LayoutDensityMode | undefined;
    let graphProfile: GraphProfileMode | undefined; let moduleAggregation: ModuleAggregationMode | undefined; let visualTheme: VisualThemeMode | undefined;
    let sourceRootGrouping: SourceRootGroupingMode | undefined; let edgePresentation: EdgePresentationMode | undefined; let clusterRanking: ClusterRankingMode | undefined;
    let outputOrder: OutputOrderMode | undefined; let aggregationDepth: number | undefined;
    try {
        externalPackages = validatePolicy('external-packages', values['external-packages'], EXTERNAL_PACKAGE_MODES);
        folderGrouping = validatePolicy('folder-grouping', values['folder-grouping'], FOLDER_GROUPING_MODES);
        edgeLabels = validatePolicy('edge-labels', values['edge-labels'], EDGE_LABEL_MODES);
        layoutDirection = validatePolicy('layout-direction', values['layout-direction'], LAYOUT_DIRECTION_MODES);
        rankConstraints = validatePolicy('rank-constraints', values['rank-constraints'], RANK_CONSTRAINT_MODES);
        layoutDensity = validatePolicy('layout-density', values['layout-density'], LAYOUT_DENSITY_MODES);
        graphProfile = validatePolicy('graph-profile', values['graph-profile'], GRAPH_PROFILE_MODES);
        moduleAggregation = validatePolicy('module-aggregation', values['module-aggregation'], MODULE_AGGREGATION_MODES);
        visualTheme = validatePolicy('visual-theme', values['visual-theme'], VISUAL_THEME_MODES);
        sourceRootGrouping = validatePolicy('source-root-grouping', values['source-root-grouping'], SOURCE_ROOT_GROUPING_MODES);
        edgePresentation = validatePolicy('edge-presentation', values['edge-presentation'], EDGE_PRESENTATION_MODES);
        clusterRanking = validatePolicy('cluster-ranking', values['cluster-ranking'], CLUSTER_RANKING_MODES);
        outputOrder = validatePolicy('output-order', values['output-order'], OUTPUT_ORDER_MODES);
        aggregationDepth = validatePositiveInteger('aggregation-depth', values['aggregation-depth']);
    } catch (error) { console.error(`Error: ${error instanceof Error ? error.message : String(error)}`); return 2; }
    const cwd = path.resolve(values.cwd ?? process.cwd()); const input = path.resolve(cwd, values.input ?? '.maritime'); const output = path.resolve(cwd, values.output);
    try {
        const stat = await fs.stat(input); let sourceRoots: string[] | undefined; let graphPath: string;
        if (stat.isDirectory()) { const validation = await validateArtifacts({ artifactDir: input, cwd }); sourceRoots = validation.manifest.sourceRoots; graphPath = path.resolve(input, validation.manifest.artifacts.graph); }
        else graphPath = input;
        const parsed: unknown = JSON.parse(await fs.readFile(graphPath, 'utf8')); const result = CruiseResultSchema.safeParse(parsed);
        if (!result.success) throw new Error(`Invalid Maritime dependency graph: ${result.error.message}`);
        const dot = renderDependencyGraphToDot(result.data, { graphProfile, externalPackages, folderGrouping, edgeLabels, layoutDirection, rankConstraints, layoutDensity, moduleAggregation, visualTheme, sourceRootGrouping, edgePresentation, clusterRanking, outputOrder, aggregationDepth }, { sourceRoots });
        const format = inferGraphvizFormat(output); await fs.mkdir(path.dirname(output), { recursive: true }); if (format === 'dot') await fs.writeFile(output, dot); else await renderDotWithGraphviz(dot, output);
        console.log(`✅ Dependency graph rendered from ${graphPath} to ${output}`); return 0;
    } catch (error) { console.error(`Error rendering dependency graph: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
