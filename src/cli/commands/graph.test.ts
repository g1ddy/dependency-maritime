import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runGraphCommand } from './graph';

describe('graph command', () => {
    const dirs: string[] = [];
    afterEach(() => { dirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); vi.restoreAllMocks(); });
    const writeGraph = (dir: string): void => fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify({ modules: [], summary: { error: 0, ignore: 0, info: 0, totalCruised: 0, violations: [], warn: 0, optionsUsed: {} } }));

    it('uses profiles as baselines and accepts presentation overrides', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir); writeGraph(dir);
        expect(await runGraphCommand([
            '--cwd', dir, '--input', 'graph.json', '--output', 'graph.dot', '--graph-profile', 'compact-architecture',
            '--visual-theme', 'standard', '--cluster-ranking', 'global', '--source-root-grouping', 'preserve',
            '--edge-presentation', 'relations', '--output-order', 'nodes-first', '--aggregation-depth', '3'
        ])).toBe(0);
        const dot = fs.readFileSync(path.join(dir, 'graph.dot'), 'utf8');
        expect(dot).toContain('rankdir="LR"');
        expect(dot).toContain('newrank="true"');
        expect(dot).toContain('outputorder="nodesfirst"');
        expect(dot).toContain('ranksep="0.12", nodesep="0.10"');
    });

    it('accepts architecture-overview as a TB named profile', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir); writeGraph(dir);
        expect(await runGraphCommand(['--cwd', dir, '--input', 'graph.json', '--output', 'graph.dot', '--graph-profile', 'architecture-overview'])).toBe(0);
        const dot = fs.readFileSync(path.join(dir, 'graph.dot'), 'utf8');
        expect(dot).toContain('newrank="true"');
        expect(dot).toContain('rankdir="TB"');
        expect(dot).not.toContain('outputorder=');
    });

    it('reports a missing Graphviz executable with an actionable error', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir); writeGraph(dir);
        const oldPath = process.env.PATH; process.env.PATH = ''; const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try { expect(await runGraphCommand(['--cwd', dir, '--input', 'graph.json', '--output', 'graph.svg'])).toBe(2); } finally { process.env.PATH = oldPath; }
        expect(error.mock.calls.flat().join(' ')).toContain('Install Graphviz');
    });

    it.each([
        ['--external-packages', 'everything', 'none, summary, direct'], ['--folder-grouping', 'deep', 'none, top-level, nested'],
        ['--edge-labels', 'names', 'none, types'], ['--graph-profile', 'small', 'default, local-architecture, compact-architecture, architecture-overview'],
        ['--layout-direction', 'diagonal', 'lr, tb'], ['--rank-constraints', 'folders', 'all, intra-folder'], ['--layout-density', 'dense', 'normal, compact'],
        ['--module-aggregation', 'files', 'none, folders'], ['--visual-theme', 'pretty', 'standard, architecture'], ['--source-root-grouping', 'drop', 'preserve, elide-single'],
        ['--edge-presentation', 'smart', 'relations, semantic-pairs'], ['--cluster-ranking', 'mixed', 'global, local'], ['--output-order', 'back', 'default, edges-first, nodes-first']
    ])('rejects invalid %s values clearly', async (flag, value, allowed) => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(await runGraphCommand(['--output', 'graph.dot', flag, value])).toBe(2);
        expect(error.mock.calls.flat().join(' ')).toContain(`Expected one of: ${allowed}`);
    });

    it('rejects invalid aggregation depth clearly', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(await runGraphCommand(['--output', 'graph.dot', '--aggregation-depth', '0'])).toBe(2);
        expect(error.mock.calls.flat().join(' ')).toContain('Expected a positive integer');
    });
});
