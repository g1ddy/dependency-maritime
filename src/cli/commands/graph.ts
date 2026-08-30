import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { EDGE_LABEL_MODES, EXTERNAL_PACKAGE_MODES, FOLDER_GROUPING_MODES, inferGraphvizFormat, renderDependencyGraphToDot, type EdgeLabelsMode, type ExternalPackagesMode, type FolderGroupingMode } from '../graph/render-dot';
import { renderDotWithGraphviz } from '../graph/render-graphviz';
import { validateArtifacts } from '../validate/validate';

export async function runGraphCommand(args: string[]): Promise<number> {
    let values: { input?: string; output?: string; cwd?: string; help?: boolean; 'external-packages'?: string; 'folder-grouping'?: string; 'edge-labels'?: string };
    try {
        values = parseArgs({ args, options: {
            input: { type: 'string', short: 'i' }, output: { type: 'string', short: 'o' },
            cwd: { type: 'string' }, help: { type: 'boolean', short: 'h' },
            'external-packages': { type: 'string' }, 'folder-grouping': { type: 'string' }, 'edge-labels': { type: 'string' }
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
  --external-packages <none|summary|direct>  External package presentation (default: direct)
  --folder-grouping <none|top-level|nested>   Local folder clustering (default: nested)
  --edge-labels <none|types>                  Dependency-type labels (default: types)
  --cwd <dir>          Working directory root for resolution
  -h, --help           Show help message
`);
        return 0;
    }
    if (!values.output) {
        console.error('Error: --output is required.');
        return 2;
    }
    const validatePolicy = <T extends string>(flag: string, value: string | undefined, allowed: readonly T[], fallback: T): T => {
        if (value === undefined) return fallback;
        if ((allowed as readonly string[]).includes(value)) return value as T;
        throw new Error(`Invalid --${flag} value "${value}". Expected one of: ${allowed.join(', ')}.`);
    };
    let externalPackages: ExternalPackagesMode;
    let folderGrouping: FolderGroupingMode;
    let edgeLabels: EdgeLabelsMode;
    try {
        externalPackages = validatePolicy('external-packages', values['external-packages'], EXTERNAL_PACKAGE_MODES, 'direct');
        folderGrouping = validatePolicy('folder-grouping', values['folder-grouping'], FOLDER_GROUPING_MODES, 'nested');
        edgeLabels = validatePolicy('edge-labels', values['edge-labels'], EDGE_LABEL_MODES, 'types');
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return 2;
    }
    const cwd = path.resolve(values.cwd ?? process.cwd());
    const input = path.resolve(cwd, values.input ?? '.maritime');
    const output = path.resolve(cwd, values.output);
    try {
        const stat = await fs.stat(input);
        const graphPath = stat.isDirectory()
            ? path.resolve(input, (await validateArtifacts({ artifactDir: input, cwd })).manifest.artifacts.graph)
            : input;
        const parsed: unknown = JSON.parse(await fs.readFile(graphPath, 'utf8'));
        const result = CruiseResultSchema.safeParse(parsed);
        if (!result.success) throw new Error(`Invalid Maritime dependency graph: ${result.error.message}`);
        const dot = renderDependencyGraphToDot(result.data, { externalPackages, folderGrouping, edgeLabels });
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
