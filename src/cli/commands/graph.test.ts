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
        const artifactDir = path.join(dir, '.maritime');
        fs.mkdirSync(artifactDir);
        fs.writeFileSync(path.join(artifactDir, 'dependency-graph.json'), '{}');
        fs.writeFileSync(path.join(artifactDir, 'complexity-metrics.json'), '{}');
        fs.writeFileSync(path.join(artifactDir, 'complexity-report.md'), '# Report');
        fs.writeFileSync(path.join(artifactDir, 'manifest.json'), JSON.stringify({
            schemaVersion: '1.0.0', toolVersion: 'test', generatedAt: '2026-01-01T00:00:00.000Z',
            sourceRoots: ['src'], artifacts: { graph: 'dependency-graph.json', metrics: 'complexity-metrics.json', report: 'complexity-report.md' },
            summary: { totalFiles: 0, healthScore: 100, scannedCount: 0, skippedCount: 0 }
        }));
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(await runGraphCommand(['--cwd', dir, '--input', '.maritime', '--output', 'graph.dot'])).toBe(2);
        expect(error.mock.calls.flat().join(' ')).toContain('Invalid dependency-cruiser graph schema');
    });

    it('renders the graph path declared by a validated artifact manifest', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-graph-')); dirs.push(dir);
        const artifactDir = path.join(dir, '.maritime');
        fs.mkdirSync(artifactDir);
        const validGraph = { modules: [], summary: {
            error: 0, ignore: 0, info: 0, totalCruised: 0, violations: [], warn: 0, optionsUsed: {}
        }};
        fs.writeFileSync(path.join(artifactDir, 'custom.json'), JSON.stringify(validGraph));
        fs.writeFileSync(path.join(artifactDir, 'complexity-metrics.json'), '{}');
        fs.writeFileSync(path.join(artifactDir, 'complexity-report.md'), '# Report');
        fs.writeFileSync(path.join(artifactDir, 'manifest.json'), JSON.stringify({
            schemaVersion: '1.0.0', toolVersion: 'test', generatedAt: '2026-01-01T00:00:00.000Z',
            sourceRoots: ['src'], artifacts: { graph: 'custom.json', metrics: 'complexity-metrics.json', report: 'complexity-report.md' },
            summary: { totalFiles: 0, healthScore: 100, scannedCount: 0, skippedCount: 0 }
        }));
        expect(await runGraphCommand(['--cwd', dir, '--input', '.maritime', '--output', 'graph.dot'])).toBe(0);
        const dot = fs.readFileSync(path.join(dir, 'graph.dot'), 'utf8');
        expect(dot).toContain('digraph "dependency-graph"');
        expect(dot).toContain('newrank="true"');
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

    it.each([
        ['--external-packages', 'everything', 'none, summary, direct'],
        ['--folder-grouping', 'deep', 'none, top-level, nested'],
        ['--edge-labels', 'names', 'none, types']
    ])('rejects invalid %s values clearly', async (flag, value, allowed) => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(await runGraphCommand(['--output', 'graph.dot', flag, value])).toBe(2);
        expect(error.mock.calls.flat().join(' ')).toContain(`Expected one of: ${allowed}`);
    });
});
