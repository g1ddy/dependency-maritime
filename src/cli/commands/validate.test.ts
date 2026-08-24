import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runValidateCommand } from './validate';

describe('runValidateCommand', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'maritime-validate-test-'));
    });

    afterEach(async () => {
        await fsPromises.rm(testDir, { recursive: true, force: true });
    });

    it('returns exit code 0 for a complete valid artifact directory', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const manifest = {
            schemaVersion: '1.0.0',
            toolVersion: '0.0.0',
            generatedAt: new Date().toISOString(),
            sourceRoots: ['src'],
            artifacts: {
                graph: 'dependency-graph.json',
                metrics: 'complexity-metrics.json',
                report: 'complexity-report.md'
            },
            summary: {
                totalFiles: 1,
                healthScore: 100,
                scannedCount: 1,
                skippedCount: 0
            }
        };

        const validGraph = {
            modules: [
                { source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }
            ],
            summary: {
                error: 0,
                warn: 0,
                info: 0,
                ignore: 0,
                totalCruised: 1,
                violations: []
            }
        };

        const validMetrics = {
            'src/index.ts': {
                complexity: 1,
                loc: 10,
                instability: 0,
                fanIn: 0,
                fanOut: 0,
                scanned: true
            }
        };

        await fsPromises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));
        await fsPromises.writeFile(path.join(outputDir, 'dependency-graph.json'), JSON.stringify(validGraph));
        await fsPromises.writeFile(path.join(outputDir, 'complexity-metrics.json'), JSON.stringify(validMetrics));
        await fsPromises.writeFile(path.join(outputDir, 'complexity-report.md'), '# Report');

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(0);
    });

    it('returns exit code 2 if artifact directory does not exist', async () => {
        const exitCode = await runValidateCommand(['nonexistent-dir', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });

    it('returns exit code 2 if manifest.json is missing', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });

    it('returns exit code 2 if manifest schema version is unsupported', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const manifest = {
            schemaVersion: '99.0.0',
            toolVersion: '0.0.0',
            generatedAt: new Date().toISOString(),
            sourceRoots: ['src'],
            artifacts: {
                graph: 'dependency-graph.json',
                metrics: 'complexity-metrics.json',
                report: 'complexity-report.md'
            },
            summary: {
                totalFiles: 1,
                healthScore: 100,
                scannedCount: 1,
                skippedCount: 0
            }
        };

        await fsPromises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });

    it('returns exit code 2 if a declared artifact file is missing', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const manifest = {
            schemaVersion: '1.0.0',
            toolVersion: '0.0.0',
            generatedAt: new Date().toISOString(),
            sourceRoots: ['src'],
            artifacts: {
                graph: 'dependency-graph.json',
                metrics: 'complexity-metrics.json',
                report: 'complexity-report.md'
            },
            summary: {
                totalFiles: 1,
                healthScore: 100,
                scannedCount: 1,
                skippedCount: 0
            }
        };

        await fsPromises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));
        // dependency-graph.json is missing!

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });

    it('returns exit code 2 if an artifact path escapes the artifact directory', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const manifest = {
            schemaVersion: '1.0.0',
            toolVersion: '0.0.0',
            generatedAt: new Date().toISOString(),
            sourceRoots: ['src'],
            artifacts: {
                graph: '../outside-graph.json',
                metrics: 'complexity-metrics.json',
                report: 'complexity-report.md'
            },
            summary: {
                totalFiles: 1,
                healthScore: 100,
                scannedCount: 1,
                skippedCount: 0
            }
        };

        await fsPromises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });

    it('returns exit code 2 if graph JSON fails schema validation', async () => {
        const outputDir = path.join(testDir, '.maritime');
        await fsPromises.mkdir(outputDir, { recursive: true });

        const manifest = {
            schemaVersion: '1.0.0',
            toolVersion: '0.0.0',
            generatedAt: new Date().toISOString(),
            sourceRoots: ['src'],
            artifacts: {
                graph: 'dependency-graph.json',
                metrics: 'complexity-metrics.json',
                report: 'complexity-report.md'
            },
            summary: {
                totalFiles: 1,
                healthScore: 100,
                scannedCount: 1,
                skippedCount: 0
            }
        };

        const invalidGraph = { notAModuleList: true };

        await fsPromises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest));
        await fsPromises.writeFile(path.join(outputDir, 'dependency-graph.json'), JSON.stringify(invalidGraph));
        await fsPromises.writeFile(path.join(outputDir, 'complexity-metrics.json'), JSON.stringify({}));
        await fsPromises.writeFile(path.join(outputDir, 'complexity-report.md'), '# Report');

        const exitCode = await runValidateCommand(['.maritime', '--cwd', testDir]);
        expect(exitCode).toBe(2);
    });
});
