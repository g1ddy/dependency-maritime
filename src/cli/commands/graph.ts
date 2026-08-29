import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import type { ICruiseResult } from '../../schema/dependency-cruiser';
import { inferGraphvizFormat, renderDependencyGraphToDot } from '../graph/render-dot';
import { renderDotWithGraphviz } from '../graph/render-graphviz';

export async function runGraphCommand(args: string[]): Promise<number> {
    let values: { input?: string; output?: string; cwd?: string; help?: boolean };
    try {
        values = parseArgs({ args, options: {
            input: { type: 'string', short: 'i' }, output: { type: 'string', short: 'o' },
            cwd: { type: 'string' }, help: { type: 'boolean', short: 'h' }
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
  --cwd <dir>          Working directory root for resolution
  -h, --help           Show help message
`);
        return 0;
    }
    if (!values.output) {
        console.error('Error: --output is required.');
        return 2;
    }
    const cwd = path.resolve(values.cwd ?? process.cwd());
    const input = path.resolve(cwd, values.input ?? '.maritime');
    const output = path.resolve(cwd, values.output);
    try {
        const stat = await fs.stat(input);
        const graphPath = stat.isDirectory() ? path.join(input, 'dependency-graph.json') : input;
        const parsed: unknown = JSON.parse(await fs.readFile(graphPath, 'utf8'));
        const result = CruiseResultSchema.safeParse(parsed);
        if (!result.success) throw new Error(`Invalid Maritime dependency graph: ${result.error.message}`);
        const dot = renderDependencyGraphToDot(result.data as unknown as ICruiseResult);
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
