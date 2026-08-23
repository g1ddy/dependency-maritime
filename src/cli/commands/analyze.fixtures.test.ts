import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runAnalyzeCommand } from './analyze';
import type { FileMetric } from '../analyze/models';

describe('analyze command integration fixtures', () => {
    const fixtureRoot = path.join(process.cwd(), 'temp-analyze-fixtures');

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        if (fs.existsSync(fixtureRoot)) {
            fs.rmSync(fixtureRoot, { recursive: true, force: true });
        }
        fs.mkdirSync(fixtureRoot, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (fs.existsSync(fixtureRoot)) {
            fs.rmSync(fixtureRoot, { recursive: true, force: true });
        }
    });

    function createGraphJson(dir: string, sources: string[]): string {
        const graphPath = path.join(dir, 'dependency-graph.json');
        const data = {
            modules: sources.map(src => ({
                source: src,
                valid: true,
                dependencies: [],
                dependents: []
            })),
            summary: {
                error: 0,
                ignore: 0,
                info: 0,
                totalCruised: sources.length,
                violations: [],
                warn: 0,
                optionsUsed: {}
            }
        };
        fs.writeFileSync(graphPath, JSON.stringify(data, null, 2));
        return 'dependency-graph.json';
    }

    it('flat-config fixture: successful analysis', async () => {
        const dir = path.join(fixtureRoot, 'flat-config');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

        fs.writeFileSync(path.join(dir, 'eslint.config.js'), 'export default [{ files: ["**/*.ts", "**/*.tsx"] }];');
        fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;\nfunction foo(a: number) { return a + 1; }\n');

        const graphFile = createGraphJson(dir, ['src/index.ts']);

        const exitCode = await runAnalyzeCommand([
            '--cwd', dir,
            '--graph', graphFile,
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(0);

        const metricsData = JSON.parse(fs.readFileSync(path.join(dir, 'metrics.json'), 'utf8')) as Record<string, FileMetric>;
        expect(metricsData['src/index.ts']).toBeDefined();
        expect(metricsData['src/index.ts'].scanned).toBe(true);
        expect(metricsData['src/index.ts'].complexity).toBeGreaterThanOrEqual(1);

        const reportData = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
        expect(reportData).toContain('Automated Complexity Report');
    });

    it('legacy .eslintrc fixture: intentional exit code 2 and actionable message', async () => {
        const dir = path.join(fixtureRoot, 'legacy-eslintrc');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

        fs.writeFileSync(path.join(dir, '.eslintrc.cjs'), 'module.exports = {};');
        fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;');

        const graphFile = createGraphJson(dir, ['src/index.ts']);

        const exitCode = await runAnalyzeCommand([
            '--cwd', dir,
            '--graph', graphFile,
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Legacy ESLint configuration detected (.eslintrc.cjs)')
        );
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Maritime requires ESLint 9+ flat configuration')
        );
    });

    it('legacy package.json eslintConfig fixture: exit code 2 and actionable message', async () => {
        const dir = path.join(fixtureRoot, 'legacy-package-json');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

        fs.writeFileSync(
            path.join(dir, 'package.json'),
            JSON.stringify({ name: 'legacy-pkg', eslintConfig: { extends: ['eslint:recommended'] } })
        );
        fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;');

        const graphFile = createGraphJson(dir, ['src/index.ts']);

        const exitCode = await runAnalyzeCommand([
            '--cwd', dir,
            '--graph', graphFile,
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Legacy ESLint configuration detected (package.json (eslintConfig))')
        );
    });

    it('ignored-file fixture: TypeScript file excluded by ESLint identified as unmeasured/skipped', async () => {
        const dir = path.join(fixtureRoot, 'ignored-file');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'build'), { recursive: true });

        fs.writeFileSync(
            path.join(dir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }, { ignores: ["build/**"] }];'
        );
        fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'export const app = "app";');
        fs.writeFileSync(path.join(dir, 'build', 'sites-vite-plugin.ts'), 'export const plugin = "plugin";');

        const graphFile = createGraphJson(dir, ['src/app.ts', 'build/sites-vite-plugin.ts']);

        const exitCode = await runAnalyzeCommand([
            '--cwd', dir,
            '--source', '.',
            '--graph', graphFile,
            '--metrics', 'metrics.json',
            '--report', 'report.md'
        ]);

        expect(exitCode).toBe(0);

        const metricsData = JSON.parse(fs.readFileSync(path.join(dir, 'metrics.json'), 'utf8')) as Record<string, FileMetric>;

        expect(metricsData['src/app.ts']).toBeDefined();
        expect(metricsData['src/app.ts'].scanned).toBe(true);
        expect(metricsData['src/app.ts'].complexity).toBe(1);

        expect(metricsData['build/sites-vite-plugin.ts']).toBeDefined();
        expect(metricsData['build/sites-vite-plugin.ts'].scanned).toBe(false);
        expect(metricsData['build/sites-vite-plugin.ts'].complexity).toBe(0);

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('1 graph source file(s) were skipped or ignored by ESLint')
        );
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('build/sites-vite-plugin.ts')
        );
    });

    it('ignored-file fixture with --fail-on-unmeasured: fails with exit code 2', async () => {
        const dir = path.join(fixtureRoot, 'ignored-file-fail');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'build'), { recursive: true });

        fs.writeFileSync(
            path.join(dir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }, { ignores: ["build/**"] }];'
        );
        fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'export const app = "app";');
        fs.writeFileSync(path.join(dir, 'build', 'sites-vite-plugin.ts'), 'export const plugin = "plugin";');

        const graphFile = createGraphJson(dir, ['src/app.ts', 'build/sites-vite-plugin.ts']);

        const exitCode = await runAnalyzeCommand([
            '--cwd', dir,
            '--source', '.',
            '--graph', graphFile,
            '--metrics', 'metrics.json',
            '--report', 'report.md',
            '--fail-on-unmeasured'
        ]);

        expect(exitCode).toBe(2);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Analysis failed because 1 graph source file(s) were not scanned by ESLint')
        );
    });
});
