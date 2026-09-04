import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { EDGE_LABEL_MODES, EXTERNAL_PACKAGE_MODES, FOLDER_GROUPING_MODES, GRAPH_PROFILE_MODES, LAYOUT_DENSITY_MODES, LAYOUT_DIRECTION_MODES, MODULE_AGGREGATION_MODES, RANK_CONSTRAINT_MODES, inferGraphvizFormat, renderDependencyGraphToDot, type EdgeLabelsMode, type ExternalPackagesMode, type FolderGroupingMode, type GraphProfileMode, type LayoutDensityMode, type LayoutDirectionMode, type ModuleAggregationMode, type RankConstraintMode } from '../graph/render-dot';
import { renderDotWithGraphviz } from '../graph/render-graphviz';
import { validateArtifacts } from '../validate/validate';

export async function runGraphCommand(args: string[]): Promise<number> {
    let values: { input?: string; output?: string; cwd?: string; help?: boolean; 'graph-profile'?: string; 'external-packages'?: string; 'folder-grouping'?: string; 'edge-labels'?: string; 'layout-direction'?: string; 'rank-constraints'?: string; 'layout-density'?: string; 'module-aggregation'?: string };
    try {
        values = parseArgs({ args, options: {
            input: { type: 'string', short: 'i' }, output: { type: 'string', short: 'o' },
            cwd: { type: 'string' }, help: { type: 'boolean', short: 'h' },
            'graph-profile': { type: 'string' }, 'external-packages': { type: 'string' }, 'folder-grouping': { type: 'string' }, 'edge-labels': { type: 'string' },
            'layout-direction': { type: 'string' }, 'rank-constraints': { type: 'string' }, 'layout-density': { type: 'string' }, 'module-aggregation': { type: 'string' }
        } }).values;
    } catch (error) {
        console.error(`Error parsing arguments: ${error instanceof Error ? error.message : String(error)}`);
        return 2;
    }
    if (values.help) {
        console.log(`
Usage: maritime graph --input <artifact-directory-or-graph.json> --output <graph.svg|graph.dot>

Renders existing canonical graph evidence without running dependency analysis.

Options:
  -i, --input <path>   .maritime directory or dependency-graph.json (default: .maritime)
  -o, --output <path>  SVG or DOT output path (required)
  --graph-profile <default|local-architecture|compact-architecture>
                             Presentation baseline; explicit options below override it (default: default)
  --external-packages <none|summary|direct>  External package presentation (default: direct)
  --folder-grouping <none|top-level|nested>   Local folder clustering (default: nested)
  --edge-labels <none|types>                  Dependency-type labels (default: types)
  --layout-direction <lr|tb>                  Graph direction (default: lr)
  --rank-constraints <all|intra-folder>       Edges that affect rank placement (default: all)
  --layout-density <normal|compact>           Node/rank separation (default: normal)
  --module-aggregation <none|folders>         File nodes or explicit folder nodes (default: none)
  --cwd <dir>          Working directory root for resolution
  -h, --help           Show help message
`);
        return 0;
    }
    if (!values.output) {
        console.error('Error: --output is required.');
        return 2;
    }
    const validatePolicy = <T extends string>(flag: string, value: string | undefined, allowed: readonly T[]): T | undefined => {
        if (value === undefined) return undefined;
        if ((allowed as readonly string[]).includes(value)) return value as T;
        throw new Error(`Invalid --${flag} value "${value}". Expected one of: ${allowed.join(', ')}.`);
    };
    let externalPackages: ExternalPackagesMode | undefined;
    let folderGrouping: FolderGroupingMode | undefined;
    let edgeLabels: EdgeLabelsMode | undefined;
    let layoutDirection: LayoutDirectionMode | undefined;
    let rankConstraints: RankConstraintMode | undefined;
    let layoutDensity: LayoutDensityMode | undefined;
    let graphProfile: GraphProfileMode | undefined;
    let moduleAggregation: ModuleAggregationMode | undefined;
    try {
        externalPackages = validatePolicy('external-packages', values['external-packages'], EXTERNAL_PACKAGE_MODES);
        folderGrouping = validatePolicy('folder-grouping', values['folder-grouping'], FOLDER_GROUPING_MODES);
        edgeLabels = validatePolicy('edge-labels', values['edge-labels'], EDGE_LABEL_MODES);
        layoutDirection = validatePolicy('layout-direction', values['layout-direction'], LAYOUT_DIRECTION_MODES);
        rankConstraints = validatePolicy('rank-constraints', values['rank-constraints'], RANK_CONSTRAINT_MODES);
        layoutDensity = validatePolicy('layout-density', values['layout-density'], LAYOUT_DENSITY_MODES);
        graphProfile = validatePolicy('graph-profile', values['graph-profile'], GRAPH_PROFILE_MODES);
        moduleAggregation = validatePolicy('module-aggregation', values['module-aggregation'], MODULE_AGGREGATION_MODES);
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return 2;
    }
    const cwd = path.resolve(values.cwd ?? process.cwd());
    const input = path.resolve(cwd, values.input ?? '.maritime');
    const output = path.resolve(cwd, values.output);
    try {
        const stat = await fs.stat(input);
        let sourceRoots: string[] | undefined;
        let graphPath: string;
        if (stat.isDirectory()) {
            const validation = await validateArtifacts({ artifactDir: input, cwd });
            sourceRoots = validation.manifest.sourceRoots;
            graphPath = path.resolve(input, validation.manifest.artifacts.graph);
        } else {
            graphPath = input;
        }
        const parsed: unknown = JSON.parse(await fs.readFile(graphPath, 'utf8'));
        const result = CruiseResultSchema.safeParse(parsed);
        if (!result.success) throw new Error(`Invalid Maritime dependency graph: ${result.error.message}`);
        const dot = renderDependencyGraphToDot(
            result.data,
            { graphProfile, externalPackages, folderGrouping, edgeLabels, layoutDirection, rankConstraints, layoutDensity, moduleAggregation },
            { sourceRoots }
        );
        const format = inferGraphvizFormat(output);
        await fs.mkdir(path.dirname(output), { recursive: true });
        if (format === 'dot') await fs.writeFile(output, dot);
        else await renderDotWithGraphviz(dot, output);
        console.log(`✅ Dependency graph rendered from ${graphPath} to ${output}`);
        return 0;
    } catch (error) {
        console.error(`Error rendering dependency graph: ${error instanceof Error ? error.message : String(error)}`);
        return 2;
    }
}
