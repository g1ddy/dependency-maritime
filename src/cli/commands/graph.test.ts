import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runGraphCommand } from './graph';

describe('graph command', () => {
    const dirs: string[] = [];
    afterEach(() => { dirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); vi.restoreAllMocks(); });

    it('accepts an artifact directory and rejects malformed canonical evidence clearly', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir);
        fs.mkdirSync(path.join(dir, '.maritime'));
        fs.writeFileSync(path.join(dir, '.maritime', 'dependency-graph.json'), '{}');
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(await runGraphCommand(['--cwd', dir, '--input', '.maritime', '--output', 'graph.dot'])).toBe(2);
        expect(error.mock.calls.flat().join(' ')).toContain('Invalid Maritime dependency graph');
    });

    it('reports a missing Graphviz executable with an actionable error', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir);
        fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify({ modules: [], summary: {
            error: 0, ignore: 0, info: 0, totalCruised: 0, violations: [], warn: 0, optionsUsed: {}
        }}));
        const oldPath = process.env.PATH;
        process.env.PATH = '';
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            expect(await runGraphCommand(['--cwd', dir, '--input', 'graph.json', '--output', 'graph.svg'])).toBe(2);
        } finally { process.env.PATH = oldPath; }
        expect(error.mock.calls.flat().join(' ')).toContain('Install Graphviz');
    });
});
