import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

describe('CLI npm pack clean-install smoke tests', () => {
    const tmpRoot = path.join(process.cwd(), 'temp-pack-smoke');
    let tarballPath: string = '';

    beforeAll(() => {
        if (fs.existsSync(tmpRoot)) {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        }
        fs.mkdirSync(tmpRoot, { recursive: true });

        // Ensure CLI is built
        execSync('npm run build:cli', { cwd: process.cwd(), stdio: 'pipe' });

        // Run npm pack
        const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
        const lines = packOutput.split('\n').map(l => l.trim()).filter(Boolean);
        const tarballName = lines[lines.length - 1];
        tarballPath = path.resolve(process.cwd(), tarballName);

        expect(fs.existsSync(tarballPath)).toBe(true);
    }, 60000);

    afterAll(() => {
        if (fs.existsSync(tmpRoot)) {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        }
        if (tarballPath && fs.existsSync(tarballPath)) {
            fs.unlinkSync(tarballPath);
        }
    });

    it('package inspection: contains compiled CLI runtime and excludes source/test/UI files', () => {
        const fileListStr = execSync(`tar -tzf "${tarballPath}"`, { encoding: 'utf8' });
        const fileList = fileListStr.split('\n').map(f => f.trim()).filter(Boolean);

        // Must contain compiled CLI files
        expect(fileList).toContain('package/dist/cli/main.js');
        expect(fileList).toContain('package/dist/cli/index.js');
        expect(fileList).toContain('package/dist/cli/index.d.ts');
        expect(fileList).toContain('package/package.json');

        // Must NOT contain source files, tests, or web UI bundles
        const forbidden = fileList.filter(f =>
            f.startsWith('package/src/') ||
            f.startsWith('package/tests/') ||
            f.startsWith('package/.github/') ||
            f.includes('index.html') ||
            f.includes('vite.config') ||
            f.endsWith('.test.ts') ||
            f.endsWith('.test.tsx')
        );

        expect(forbidden).toEqual([]);
    }, 30000);

    it('clean-install Catan Hex Mastery fixture: analyzes project via maritime binary entry point and verifies light dependency tree', () => {
        const catanDir = path.join(tmpRoot, 'catan-hex-mastery');
        fs.mkdirSync(path.join(catanDir, 'src', 'board'), { recursive: true });
        fs.mkdirSync(path.join(catanDir, 'src', 'game'), { recursive: true });

        fs.writeFileSync(
            path.join(catanDir, 'package.json'),
            JSON.stringify({
                name: 'catan-hex-mastery',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(catanDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(catanDir, 'src', 'board', 'hex.ts'),
            'export function getNeighbors(h) { return [{ q: h.q + 1, r: h.r }, { q: h.q - 1, r: h.r }]; }\n'
        );

        fs.writeFileSync(
            path.join(catanDir, 'src', 'game', 'engine.ts'),
            'import { getNeighbors } from "../board/hex";\nexport function setupGame(h) { return getNeighbors(h); }\n'
        );

        const graphData = {
            modules: [
                {
                    source: 'src/board/hex.ts',
                    valid: true,
                    dependencies: [],
                    dependents: ['src/game/engine.ts']
                },
                {
                    source: 'src/game/engine.ts',
                    valid: true,
                    dependencies: [
                        {
                            circular: false,
                            coreModule: false,
                            couldNotResolve: false,
                            dependencyTypes: ['local'],
                            dynamic: false,
                            exoticallyRequired: false,
                            followable: true,
                            moduleSystem: 'es6',
                            module: '../board/hex',
                            resolved: 'src/board/hex.ts',
                            valid: true
                        }
                    ],
                    dependents: []
                }
            ],
            summary: { error: 0, ignore: 0, info: 0, totalCruised: 2, violations: [], warn: 0, optionsUsed: {} }
        };

        fs.writeFileSync(path.join(catanDir, 'dependency-graph.json'), JSON.stringify(graphData, null, 2));

        // Install packed CLI tarball and eslint peer dependency into clean fixture
        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: catanDir, stdio: 'pipe' });

        // Verify installed package brings zod runtime dependency but NOT React, Vite, D3, or UI dependencies
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'zod'))).toBe(true);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'react'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'react-dom'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'vite'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'd3'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', '@xyflow/react'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'tailwindcss'))).toBe(false);
        expect(fs.existsSync(path.join(catanDir, 'node_modules', 'lucide-react'))).toBe(false);

        // Verify --help command works
        const helpOutput = execSync('npx maritime analyze --help', { cwd: catanDir, encoding: 'utf8' });
        expect(helpOutput).toContain('Usage: maritime analyze');

        const graphHelpOutput = execSync('npx maritime graph --help', { cwd: catanDir, encoding: 'utf8' });
        expect(graphHelpOutput).toContain('Usage: maritime graph');
        execSync('npx maritime graph --input dependency-graph.json --output dependency-graph.dot', { cwd: catanDir });
        const renderedDot = fs.readFileSync(path.join(catanDir, 'dependency-graph.dot'), 'utf8');
        expect(renderedDot).toContain('cluster:src/board');
        expect(renderedDot).toContain('local:src/game/engine.ts');

        // Run real analysis command
        const analyzeOutput = execSync('npx maritime analyze --graph dependency-graph.json --metrics metrics.json --report report.md', {
            cwd: catanDir,
            encoding: 'utf8'
        });

        expect(analyzeOutput).toContain('Starting Complexity Analysis...');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        // Check generated artifacts
        expect(fs.existsSync(path.join(catanDir, 'metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(catanDir, 'report.md'))).toBe(true);

        const metrics = JSON.parse(fs.readFileSync(path.join(catanDir, 'metrics.json'), 'utf8')) as Record<string, { scanned: boolean }>;
        expect(metrics['src/board/hex.ts']).toBeDefined();
        expect(metrics['src/board/hex.ts'].scanned).toBe(true);
        expect(metrics['src/game/engine.ts']).toBeDefined();
        expect(metrics['src/game/engine.ts'].scanned).toBe(true);

        const report = fs.readFileSync(path.join(catanDir, 'report.md'), 'utf8');
        expect(report).toContain('Automated Complexity Report');
        expect(report).toContain('Total Graph Files**: 2');
        expect(report).toContain('Measured Files**: 2');
    }, 60000);

    it('clean-install generated-graph fallback layout: generates graph with no consumer config using portable fallback', () => {
        const genDir = path.join(tmpRoot, 'generated-graph-smoke');
        fs.mkdirSync(path.join(genDir, 'app', 'domain'), { recursive: true });

        fs.writeFileSync(
            path.join(genDir, 'package.json'),
            JSON.stringify({
                name: 'generated-graph-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(genDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(genDir, 'app', 'domain', 'model.ts'),
            'export function createUser(id) { return { id, name: "User" }; }\n'
        );

        fs.writeFileSync(
            path.join(genDir, 'app', 'main.ts'),
            'import { createUser } from "./domain/model";\nexport function run() { return createUser("1"); }\n'
        );

        // Install packed CLI tarball and eslint
        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: genDir, stdio: 'pipe' });

        // Run concise generated-graph command
        const analyzeOutput = execSync('npx maritime analyze --source app --output .maritime', {
            cwd: genDir,
            encoding: 'utf8'
        });

        expect(analyzeOutput).toContain('Generating Dependency Graph with dependency-cruiser...');
        expect(analyzeOutput).toContain('Dependency-Cruiser Config Source: fallback');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        // Check generated artifacts in .maritime directory
        expect(fs.existsSync(path.join(genDir, '.maritime', 'dependency-graph.json'))).toBe(true);
        expect(fs.existsSync(path.join(genDir, '.maritime', 'complexity-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(genDir, '.maritime', 'complexity-report.md'))).toBe(true);
        expect(fs.existsSync(path.join(genDir, '.maritime', 'manifest.json'))).toBe(true);

        const validateOutput = execSync('npx maritime validate .maritime', {
            cwd: genDir,
            encoding: 'utf8'
        });
        expect(validateOutput).toContain('Artifact Directory Contract Validated!');
        expect(validateOutput).toContain('Schema Version: 1.0.0');

        const metrics = JSON.parse(
            fs.readFileSync(path.join(genDir, '.maritime', 'complexity-metrics.json'), 'utf8')
        ) as Record<string, { scanned: boolean }>;

        expect(metrics['app/domain/model.ts']).toBeDefined();
        expect(metrics['app/domain/model.ts'].scanned).toBe(true);
        expect(metrics['app/main.ts']).toBeDefined();
        expect(metrics['app/main.ts'].scanned).toBe(true);
    }, 60000);

    it('clean-install explicit CJS dependency-cruiser config layout: generates graph using custom CJS config', () => {
        const cjsDir = path.join(tmpRoot, 'explicit-cjs-smoke');
        fs.mkdirSync(path.join(cjsDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(cjsDir, 'config'), { recursive: true });

        fs.writeFileSync(
            path.join(cjsDir, 'package.json'),
            JSON.stringify({
                name: 'explicit-cjs-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(cjsDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(cjsDir, 'config', 'dependency-cruiser.cjs'),
            'module.exports = { options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true } };\n'
        );

        fs.writeFileSync(
            path.join(cjsDir, 'src', 'util.ts'),
            'export function add(a, b) { return a + b; }\n'
        );

        fs.writeFileSync(
            path.join(cjsDir, 'src', 'index.ts'),
            'import { add } from "./util";\nexport function calculate() { return add(1, 2); }\n'
        );

        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: cjsDir, stdio: 'pipe' });

        const analyzeOutput = execSync(
            'npx maritime analyze --source src --output .maritime --depcruise-config config/dependency-cruiser.cjs',
            { cwd: cjsDir, encoding: 'utf8' }
        );

        expect(analyzeOutput).toContain('Dependency-Cruiser Config Source: explicit');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        expect(fs.existsSync(path.join(cjsDir, '.maritime', 'dependency-graph.json'))).toBe(true);
        expect(fs.existsSync(path.join(cjsDir, '.maritime', 'complexity-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(cjsDir, '.maritime', 'complexity-report.md'))).toBe(true);

        const metrics = JSON.parse(
            fs.readFileSync(path.join(cjsDir, '.maritime', 'complexity-metrics.json'), 'utf8')
        ) as Record<string, { scanned: boolean }>;

        expect(metrics['src/index.ts']).toBeDefined();
        expect(metrics['src/index.ts'].scanned).toBe(true);
        expect(metrics['src/util.ts']).toBeDefined();
        expect(metrics['src/util.ts'].scanned).toBe(true);
    }, 60000);

    it('clean-install explicit ESM dependency-cruiser config layout: generates graph using custom ESM config', () => {
        const esmDir = path.join(tmpRoot, 'explicit-esm-smoke');
        fs.mkdirSync(path.join(esmDir, 'src'), { recursive: true });

        fs.writeFileSync(
            path.join(esmDir, 'package.json'),
            JSON.stringify({
                name: 'explicit-esm-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(esmDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(esmDir, 'dependency-cruiser.config.mjs'),
            'export default { options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true } };\n'
        );

        fs.writeFileSync(
            path.join(esmDir, 'src', 'service.ts'),
            'export function fetchData() { return "data"; }\n'
        );

        fs.writeFileSync(
            path.join(esmDir, 'src', 'index.ts'),
            'import { fetchData } from "./service";\nexport function run() { return fetchData(); }\n'
        );

        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: esmDir, stdio: 'pipe' });

        const analyzeOutput = execSync(
            'npx maritime analyze --source src --output .maritime --depcruise-config dependency-cruiser.config.mjs',
            { cwd: esmDir, encoding: 'utf8' }
        );

        expect(analyzeOutput).toContain('Dependency-Cruiser Config Source: explicit');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        expect(fs.existsSync(path.join(esmDir, '.maritime', 'dependency-graph.json'))).toBe(true);
        expect(fs.existsSync(path.join(esmDir, '.maritime', 'complexity-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(esmDir, '.maritime', 'complexity-report.md'))).toBe(true);

        const metrics = JSON.parse(
            fs.readFileSync(path.join(esmDir, '.maritime', 'complexity-metrics.json'), 'utf8')
        ) as Record<string, { scanned: boolean }>;

        expect(metrics['src/index.ts']).toBeDefined();
        expect(metrics['src/index.ts'].scanned).toBe(true);
        expect(metrics['src/service.ts']).toBeDefined();
        expect(metrics['src/service.ts'].scanned).toBe(true);
    }, 60000);

    it('clean-install generated-graph multi-root fixture: includes selected roots, excludes unselected trees, and passes --fail-on-unmeasured', () => {
        const multiRootDir = path.join(tmpRoot, 'generated-multi-root-smoke');
        fs.mkdirSync(path.join(multiRootDir, 'app'), { recursive: true });
        fs.mkdirSync(path.join(multiRootDir, 'components'), { recursive: true });
        fs.mkdirSync(path.join(multiRootDir, 'lib'), { recursive: true });
        fs.mkdirSync(path.join(multiRootDir, 'outside'), { recursive: true });

        fs.writeFileSync(
            path.join(multiRootDir, 'package.json'),
            JSON.stringify({
                name: 'generated-multi-root-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.mkdirSync(path.join(multiRootDir, 'config'), { recursive: true });
        fs.writeFileSync(
            path.join(multiRootDir, 'config', 'dependency-cruiser.cjs'),
            'module.exports = { options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true } };\n'
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'lib', 'math.ts'),
            'export function square(n) { return n * n; }\n'
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'components', 'card.tsx'),
            'import { square } from "../lib/math";\nexport function Card(props) { return square(props.val); }\n'
        );

        // Keep these selected-root files unreferenced: they prove every --source root
        // is passed to dependency-cruiser instead of being discovered only through app imports.
        fs.writeFileSync(
            path.join(multiRootDir, 'components', 'standalone.tsx'),
            'export const standaloneComponent = "selected independently";\n'
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'lib', 'standalone.ts'),
            'export const standaloneLibrary = "selected independently";\n'
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'app', 'page.tsx'),
            'import { Card } from "../components/card";\nexport default function Page() { return Card({ val: 4 }); }\n'
        );

        fs.writeFileSync(
            path.join(multiRootDir, 'outside', 'ignored.ts'),
            'export const unselected = "this file is not in selected source roots";\n'
        );

        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: multiRootDir, stdio: 'pipe' });

        const analyzeOutput = execSync(
            'npx maritime analyze --source app --source components --source lib --output .maritime --depcruise-config config/dependency-cruiser.cjs --fail-on-unmeasured',
            { cwd: multiRootDir, encoding: 'utf8' }
        );

        expect(analyzeOutput).toContain('Source Root (raw): app, components, lib');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        expect(fs.existsSync(path.join(multiRootDir, '.maritime', 'dependency-graph.json'))).toBe(true);
        expect(fs.existsSync(path.join(multiRootDir, '.maritime', 'complexity-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(multiRootDir, '.maritime', 'complexity-report.md'))).toBe(true);

        const metrics = JSON.parse(
            fs.readFileSync(path.join(multiRootDir, '.maritime', 'complexity-metrics.json'), 'utf8')
        ) as Record<string, { scanned: boolean }>;

        // Files from selected roots must receive local metric records
        expect(metrics['app/page.tsx']).toBeDefined();
        expect(metrics['app/page.tsx'].scanned).toBe(true);
        expect(metrics['components/card.tsx']).toBeDefined();
        expect(metrics['components/card.tsx'].scanned).toBe(true);
        expect(metrics['lib/math.ts']).toBeDefined();
        expect(metrics['lib/math.ts'].scanned).toBe(true);
        expect(metrics['components/standalone.tsx']).toBeDefined();
        expect(metrics['components/standalone.tsx'].scanned).toBe(true);
        expect(metrics['lib/standalone.ts']).toBeDefined();
        expect(metrics['lib/standalone.ts'].scanned).toBe(true);

        // Files outside selected roots must NOT become local metric records
        expect(metrics['outside/ignored.ts']).toBeUndefined();

        const report = fs.readFileSync(path.join(multiRootDir, '.maritime', 'complexity-report.md'), 'utf8');
        expect(report).toContain('Total Graph Files**: 5');
        expect(report).toContain('Measured Files**: 5');
        expect(report).toContain('Unmeasured Files**: 0');
    }, 60000);

    it('clean-install supplied-graph outside output dir: stages graph into output dir, leaves original unchanged, and validates successfully', () => {
        const suppliedDir = path.join(tmpRoot, 'supplied-outside-smoke');
        const outsideDir = path.join(suppliedDir, 'outside');
        fs.mkdirSync(path.join(suppliedDir, 'src'), { recursive: true });
        fs.mkdirSync(outsideDir, { recursive: true });

        fs.writeFileSync(
            path.join(suppliedDir, 'package.json'),
            JSON.stringify({
                name: 'supplied-outside-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(suppliedDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(suppliedDir, 'src', 'index.ts'),
            'export const a = 1;\n'
        );

        const originalGraphData = JSON.stringify({
            modules: [
                { source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }
            ],
            summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
        }, null, 2);

        const outsideGraphPath = path.join(outsideDir, 'custom-graph.json');
        fs.writeFileSync(outsideGraphPath, originalGraphData);

        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: suppliedDir, stdio: 'pipe' });

        const analyzeOutput = execSync('npx maritime analyze --graph outside/custom-graph.json --output .maritime', {
            cwd: suppliedDir,
            encoding: 'utf8'
        });

        expect(analyzeOutput).toContain('Staging supplied graph into artifact directory...');

        // Verify original graph file remains unchanged
        expect(fs.existsSync(outsideGraphPath)).toBe(true);
        expect(fs.readFileSync(outsideGraphPath, 'utf8')).toBe(originalGraphData);

        // Verify staged graph exists inside .maritime
        const stagedGraphPath = path.join(suppliedDir, '.maritime', 'custom-graph.json');
        expect(fs.existsSync(stagedGraphPath)).toBe(true);

        // Verify manifest contents
        const manifest = JSON.parse(
            fs.readFileSync(path.join(suppliedDir, '.maritime', 'manifest.json'), 'utf8')
        ) as { toolVersion: string; artifacts: { graph: string } };

        expect(manifest.artifacts.graph).toBe('custom-graph.json');
        expect(manifest.artifacts.graph).not.toContain('..');

        // Verify validate accepts .maritime
        const validateOutput = execSync('npx maritime validate .maritime', {
            cwd: suppliedDir,
            encoding: 'utf8'
        });
        expect(validateOutput).toContain('Artifact Directory Contract Validated!');
    }, 60000);

    it('validate rejects a manifest with path-escaping artifact declaration', () => {
        const escapeDir = path.join(tmpRoot, 'path-escape-smoke');
        const maritimeDir = path.join(escapeDir, '.maritime');
        fs.mkdirSync(maritimeDir, { recursive: true });

        fs.writeFileSync(
            path.join(escapeDir, 'package.json'),
            JSON.stringify({
                name: 'path-escape-smoke',
                version: '1.0.0',
                type: 'module'
            }, null, 2)
        );

        const validGraph = JSON.stringify({
            modules: [],
            summary: { error: 0, ignore: 0, info: 0, totalCruised: 0, violations: [], warn: 0, optionsUsed: {} }
        });

        fs.writeFileSync(path.join(maritimeDir, 'complexity-metrics.json'), '{}');
        fs.writeFileSync(path.join(maritimeDir, 'complexity-report.md'), '# Report');
        fs.writeFileSync(path.join(escapeDir, 'outside-graph.json'), validGraph);

        fs.writeFileSync(
            path.join(maritimeDir, 'manifest.json'),
            JSON.stringify({
                schemaVersion: '1.0.0',
                toolVersion: '0.0.0',
                generatedAt: new Date().toISOString(),
                sourceRoots: ['src'],
                artifacts: {
                    graph: '../outside-graph.json',
                    metrics: 'complexity-metrics.json',
                    report: 'complexity-report.md'
                },
                summary: { totalFiles: 0, healthScore: 100, scannedCount: 0, skippedCount: 0 }
            }, null, 2)
        );

        execSync(`npm install "${tarballPath}" --no-save --omit=peer`, { cwd: escapeDir, stdio: 'pipe' });

        let exitCode = 0;
        let output = '';
        try {
            execSync('npx maritime validate .maritime', { cwd: escapeDir, encoding: 'utf8', stdio: 'pipe' });
        } catch (err: unknown) {
            const execErr = err as { status?: number; stdout?: string; stderr?: string };
            exitCode = execErr.status ?? 1;
            output = (execErr.stdout || '') + (execErr.stderr || '');
        }

        expect(exitCode).toBe(2);
        expect(output).toContain('escapes the artifact directory');
    }, 60000);

    it('clean-install multi-root fixture repository: analyzes project with multi-source roots and programmatic API', () => {
        const crawlerDir = path.join(tmpRoot, 'crawler-command-interface');
        fs.mkdirSync(path.join(crawlerDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(crawlerDir, 'lib'), { recursive: true });

        fs.writeFileSync(
            path.join(crawlerDir, 'package.json'),
            JSON.stringify({
                name: 'crawler-command-interface',
                version: '1.0.0',
                type: 'module',
                devDependencies: {
                    eslint: '^9.0.0'
                }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(crawlerDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(crawlerDir, 'src', 'crawler.ts'),
            'export function crawl(url) { return url.length > 0 ? "ok" : "empty"; }\n'
        );

        fs.writeFileSync(
            path.join(crawlerDir, 'lib', 'parser.ts'),
            'export function parseHtml(html: string) { return html.split("<"); }\n'
        );

        const graphData = {
            modules: [
                { source: 'src/crawler.ts', valid: true, dependencies: [], dependents: [] },
                { source: 'lib/parser.ts', valid: true, dependencies: [], dependents: [] }
            ],
            summary: { error: 0, ignore: 0, info: 0, totalCruised: 2, violations: [], warn: 0, optionsUsed: {} }
        };

        fs.writeFileSync(path.join(crawlerDir, 'dependency-graph.json'), JSON.stringify(graphData, null, 2));

        // Install packed CLI tarball and eslint into clean fixture
        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: crawlerDir, stdio: 'pipe' });

        // Run multi-source analysis
        const analyzeOutput = execSync('npx maritime analyze --source src --source lib --graph dependency-graph.json --metrics metrics.json --report report.md', {
            cwd: crawlerDir,
            encoding: 'utf8'
        });

        expect(analyzeOutput).toContain('Source Root (raw): src, lib');
        expect(analyzeOutput).toContain('Complexity Report Updated and Metrics Exported!');

        const metrics = JSON.parse(fs.readFileSync(path.join(crawlerDir, 'metrics.json'), 'utf8')) as Record<string, { scanned: boolean }>;
        expect(metrics['src/crawler.ts']).toBeDefined();
        expect(metrics['lib/parser.ts']).toBeDefined();

        // Test Programmatic API export usage from installed package
        const testScript = `
            import { analyzeProject } from '@dependency-maritime/cli';
            const code = await analyzeProject({
                cwd: process.cwd(),
                source: ['src', 'lib'],
                graph: 'dependency-graph.json',
                metrics: 'prog-metrics.json',
                report: 'prog-report.md'
            });
            if (code !== 0) process.exit(code);
        `;
        fs.writeFileSync(path.join(crawlerDir, 'run-prog.js'), testScript);

        execSync('node run-prog.js', { cwd: crawlerDir, stdio: 'pipe' });
        expect(fs.existsSync(path.join(crawlerDir, 'prog-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(crawlerDir, 'prog-report.md'))).toBe(true);
    }, 60000);

    it('missing ESLint peer dependency fails with exit code 2 and an actionable error', () => {
        const noEslintDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-no-eslint-'));
        try {
            fs.mkdirSync(path.join(noEslintDir, 'src'), { recursive: true });

            fs.writeFileSync(
                path.join(noEslintDir, 'package.json'),
                JSON.stringify({
                    name: 'no-eslint-fixture',
                    version: '1.0.0',
                    type: 'module'
                }, null, 2)
            );

            fs.writeFileSync(
                path.join(noEslintDir, 'eslint.config.js'),
                'export default [];\n'
            );

            fs.writeFileSync(
                path.join(noEslintDir, 'src', 'index.ts'),
                'export const x = 1;\n'
            );

            const graphData = {
                modules: [{ source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }],
                summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
            };

            fs.writeFileSync(path.join(noEslintDir, 'dependency-graph.json'), JSON.stringify(graphData, null, 2));

            // Install packed CLI without peer dependencies
            execSync(`npm install "${tarballPath}" --no-save --omit=peer`, { cwd: noEslintDir, stdio: 'pipe' });

            // Ensure eslint is deleted if npm auto-installed it
            const installedEslint = path.join(noEslintDir, 'node_modules', 'eslint');
            if (fs.existsSync(installedEslint)) {
                fs.rmSync(installedEslint, { recursive: true, force: true });
            }

            let output = '';
            let exitCode = 0;
            try {
                execSync('npx maritime analyze --graph dependency-graph.json --metrics metrics.json --report report.md', {
                    cwd: noEslintDir,
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
            } catch (err: unknown) {
                const execErr = err as { status?: number; stdout?: string; stderr?: string };
                exitCode = execErr.status ?? 1;
                output = (execErr.stdout || '') + (execErr.stderr || '');
            }

            expect(exitCode).toBe(2);
            expect(output).toContain('ESLint is not installed');
            expect(output).toContain('requires ESLint 9+ as a peer dependency');
        } finally {
            if (fs.existsSync(noEslintDir)) {
                fs.rmSync(noEslintDir, { recursive: true, force: true });
            }
        }
    }, 60000);

    it('unsupported ESLint version (<9.0.0) fails with exit code 2 and an actionable error', () => {
        const unsupportedEslintDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-unsupported-eslint-'));
        try {
            fs.mkdirSync(path.join(unsupportedEslintDir, 'src'), { recursive: true });

            fs.writeFileSync(
                path.join(unsupportedEslintDir, 'package.json'),
                JSON.stringify({
                    name: 'unsupported-eslint-fixture',
                    version: '1.0.0',
                    type: 'module'
                }, null, 2)
            );

            fs.writeFileSync(
                path.join(unsupportedEslintDir, 'eslint.config.js'),
                'export default [];\n'
            );

            fs.writeFileSync(
                path.join(unsupportedEslintDir, 'src', 'index.ts'),
                'export const x = 1;\n'
            );

            const graphData = {
                modules: [{ source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }],
                summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} }
            };

            fs.writeFileSync(path.join(unsupportedEslintDir, 'dependency-graph.json'), JSON.stringify(graphData, null, 2));

            // Install packed CLI
            execSync(`npm install "${tarballPath}" --no-save --omit=peer`, { cwd: unsupportedEslintDir, stdio: 'pipe' });

            // Mock ESLint version 8.57.0 in node_modules
            const eslintDir = path.join(unsupportedEslintDir, 'node_modules', 'eslint');
            fs.mkdirSync(eslintDir, { recursive: true });
            fs.writeFileSync(
                path.join(eslintDir, 'package.json'),
                JSON.stringify({ name: 'eslint', version: '8.57.0', main: 'index.js' })
            );
            fs.writeFileSync(
                path.join(eslintDir, 'index.js'),
                'module.exports = { ESLint: class { static version = "8.57.0"; } };'
            );

            let output = '';
            let exitCode = 0;
            try {
                execSync('npx maritime analyze --graph dependency-graph.json --metrics metrics.json --report report.md', {
                    cwd: unsupportedEslintDir,
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
            } catch (err: unknown) {
                const execErr = err as { status?: number; stdout?: string; stderr?: string };
                exitCode = execErr.status ?? 1;
                output = (execErr.stdout || '') + (execErr.stderr || '');
            }

            expect(exitCode).toBe(2);
            expect(output).toContain('Unsupported ESLint version (v8.57.0)');
            expect(output).toContain('requires ESLint >=9.0.0');
        } finally {
            if (fs.existsSync(unsupportedEslintDir)) {
                fs.rmSync(unsupportedEslintDir, { recursive: true, force: true });
            }
        }
    }, 60000);

    it('composite action integration contract: action.yml exists and declares supported consumer inputs', () => {
        const actionPath = path.join(process.cwd(), 'action.yml');
        expect(fs.existsSync(actionPath)).toBe(true);

        const actionContent = fs.readFileSync(actionPath, 'utf8');

        // Verify required inputs exist in action.yml
        const requiredInputs = [
            'node-version',
            'cli-source',
            'source-roots',
            'depcruise-config',
            'output-dir',
            'fail-on-unmeasured',
            'upload-artifact',
            'artifact-name'
        ];

        for (const input of requiredInputs) {
            expect(actionContent).toContain(`${input}:`);
        }

        // Verify steps call setup-node, analyze, validate, and upload-artifact
        expect(actionContent).toContain('actions/setup-node');
        expect(actionContent).toContain('analyze');
        expect(actionContent).toContain('validate');
        expect(actionContent).toContain('actions/upload-artifact');
        expect(actionContent).toContain('@dependency-maritime/cli@0.1.0-beta.3');
        expect(actionContent).toContain("default: ''");
    });

    it('executable composite action smoke test: parses action.yml and executes steps against clean consumer workspace', () => {
        const actionConsumerDir = path.join(tmpRoot, 'action-consumer-smoke');
        fs.mkdirSync(path.join(actionConsumerDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(actionConsumerDir, 'lib'), { recursive: true });

        fs.writeFileSync(
            path.join(actionConsumerDir, 'package.json'),
            JSON.stringify({
                name: 'action-consumer-smoke',
                version: '1.0.0',
                type: 'module',
                devDependencies: { eslint: '^9.0.0' }
            }, null, 2)
        );

        fs.writeFileSync(
            path.join(actionConsumerDir, 'eslint.config.js'),
            'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n'
        );

        fs.writeFileSync(
            path.join(actionConsumerDir, 'src', 'app.ts'),
            'import { helper } from "../lib/helper";\nexport function run() { return helper(); }\n'
        );

        fs.writeFileSync(
            path.join(actionConsumerDir, 'lib', 'helper.ts'),
            'export function helper() { return "ok"; }\n'
        );

        // Read and parse actual run scripts from action.yml using js-yaml
        const actionYaml = fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8');
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        const actionObj = (yaml as any).load(actionYaml) as {
            runs: { steps: Array<{ run?: string }> };
        };
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

        const runBlocks = actionObj.runs.steps
            .map(step => step.run)
            .filter((run): run is string => Boolean(run));

        expect(runBlocks.length).toBeGreaterThanOrEqual(3);

        const gEnvFile = path.join(actionConsumerDir, 'github_env');
        fs.writeFileSync(gEnvFile, '');

        // Execute step run blocks from action.yml in sequence simulating GitHub Actions runner GITHUB_ENV persistence
        const fullScript = `
            set -e
            export GITHUB_ENV="${gEnvFile}"
            ${runBlocks[0]}
            set -a
            [ -f "$GITHUB_ENV" ] && . "$GITHUB_ENV"
            set +a
            ${runBlocks[1]}
            set -a
            [ -f "$GITHUB_ENV" ] && . "$GITHUB_ENV"
            set +a
            ${runBlocks[2]}
        `;
        const scriptPath = path.join(actionConsumerDir, 'run-action-direct.sh');
        fs.writeFileSync(scriptPath, fullScript);

        const execResult = execSync('bash run-action-direct.sh', {
            cwd: actionConsumerDir,
            env: {
                ...process.env,
                // Exercise the no-input branch while redirecting this prerelease
                // package name to the already-inspected artifact in the test's
                // isolated npm environment. No consumer cli-source is supplied.
                INPUT_CLI_SOURCE: '',
                MARITIME_CLI_TEST_SOURCE: tarballPath,
                INPUT_SOURCE_ROOTS: 'src lib',
                INPUT_OUTPUT_DIR: '.maritime',
                INPUT_FAIL_ON_UNMEASURED: 'true'
            },
            encoding: 'utf8'
        });

        expect(execResult).toContain('Complexity Report Updated and Metrics Exported!');
        expect(execResult).toContain('Artifact Directory Contract Validated!');

        const outputMaritime = path.join(actionConsumerDir, '.maritime');
        expect(fs.existsSync(path.join(outputMaritime, 'manifest.json'))).toBe(true);
        expect(fs.existsSync(path.join(outputMaritime, 'dependency-graph.json'))).toBe(true);
        expect(fs.existsSync(path.join(outputMaritime, 'complexity-metrics.json'))).toBe(true);
        expect(fs.existsSync(path.join(outputMaritime, 'complexity-report.md'))).toBe(true);
    }, 60000);
});
