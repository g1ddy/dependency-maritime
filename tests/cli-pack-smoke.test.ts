import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

describe('CLI npm pack clean-install smoke tests', () => {
    const tmpRoot = path.join(process.cwd(), 'temp-pack-smoke');
    let tarballPath = '';

    beforeAll(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
        fs.mkdirSync(tmpRoot, { recursive: true });
        execSync('npm run build:cli', { cwd: process.cwd(), stdio: 'pipe' });
        const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
        tarballPath = path.resolve(process.cwd(), packOutput.split('\n').map(line => line.trim()).filter(Boolean).at(-1) ?? '');
        expect(fs.existsSync(tarballPath)).toBe(true);
    }, 60000);

    afterAll(() => {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
        if (tarballPath && fs.existsSync(tarballPath)) fs.unlinkSync(tarballPath);
    });

    const writePackage = (dir: string, name: string): void => {
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
            name, version: '1.0.0', type: 'module', devDependencies: { eslint: '^9.0.0' }
        }, null, 2));
        fs.writeFileSync(path.join(dir, 'eslint.config.js'), 'export default [{ files: ["**/*.ts", "**/*.tsx"] }];\n');
    };

    const installPacked = (dir: string): void => {
        execSync(`npm install "${tarballPath}" eslint@^9.0.0 --no-save`, { cwd: dir, stdio: 'pipe' });
    };

    it('package inspection contains compiled CLI and excludes source/test/UI files', () => {
        const files = execSync(`tar -tzf "${tarballPath}"`, { encoding: 'utf8' }).split('\n').filter(Boolean);
        expect(files).toContain('package/dist/cli/main.js');
        expect(files).toContain('package/dist/cli/index.js');
        expect(files).toContain('package/dist/cli/index.d.ts');
        expect(files.filter(file => file.startsWith('package/src/') || file.startsWith('package/tests/') || file.startsWith('package/.github/'))).toEqual([]);
    });

    it('clean-install Catan fixture exposes standardized profiles and renders compact vs overview distinctly', () => {
        const dir = path.join(tmpRoot, 'catan');
        fs.mkdirSync(path.join(dir, 'src', 'board'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'src', 'game'), { recursive: true });
        writePackage(dir, 'catan-hex-mastery');
        fs.writeFileSync(path.join(dir, 'src', 'board', 'hex.ts'), 'export const hex = 1;\n');
        fs.writeFileSync(path.join(dir, 'src', 'game', 'engine.ts'), 'import { hex } from "../board/hex"; export const engine = hex;\n');
        const graph = {
            modules: [
                { source: 'src/board/hex.ts', valid: true, dependencies: [], dependents: ['src/game/engine.ts'] },
                { source: 'src/game/engine.ts', valid: true, dependencies: [{
                    circular: false, coreModule: false, couldNotResolve: false, dependencyTypes: ['local'], dynamic: false,
                    exoticallyRequired: false, followable: true, moduleSystem: 'es6', module: '../board/hex', resolved: 'src/board/hex.ts', valid: true
                }], dependents: [] }
            ],
            summary: { error: 0, ignore: 0, info: 0, totalCruised: 2, violations: [], warn: 0, optionsUsed: { args: ['src'] } }
        };
        fs.writeFileSync(path.join(dir, 'dependency-graph.json'), JSON.stringify(graph));
        installPacked(dir);

        const exported = execSync(`node --input-type=module -e "import { GRAPH_PROFILE_MODES,VISUAL_THEME_MODES,SOURCE_ROOT_GROUPING_MODES,EDGE_PRESENTATION_MODES,CLUSTER_RANKING_MODES } from '@dependency-maritime/cli'; console.log([GRAPH_PROFILE_MODES.join(','),VISUAL_THEME_MODES.join(','),SOURCE_ROOT_GROUPING_MODES.join(','),EDGE_PRESENTATION_MODES.join(','),CLUSTER_RANKING_MODES.join(',')].join('|'))"`, { cwd: dir, encoding: 'utf8' }).trim();
        expect(exported).toBe('default,local-architecture,compact-architecture,architecture-overview|standard,architecture|preserve,elide-single|relations,semantic-pairs|global,local');

        execSync('npx maritime graph --input dependency-graph.json --output compact.dot --graph-profile compact-architecture', { cwd: dir });
        const compact = fs.readFileSync(path.join(dir, 'compact.dot'), 'utf8');
        expect(compact).toContain('local:src/game/engine.ts');
        expect(compact).not.toContain('folder:src/game');
        expect(compact).not.toContain('subgraph "cluster:src"');
        expect(compact).toContain('rankdir="LR"');
        expect(compact).toContain('ranksep="0.12", nodesep="0.10"');

        execSync('npx maritime graph --input dependency-graph.json --output overview.dot --graph-profile architecture-overview', { cwd: dir });
        const overview = fs.readFileSync(path.join(dir, 'overview.dot'), 'utf8');
        expect(overview).toContain('folder:src/board');
        expect(overview).toContain('folder:src/game');
        expect(overview).not.toContain('local:src/game/engine.ts');
        expect(overview).toContain('newrank="true"');
    }, 60000);

    it('generated-graph fallback creates and validates the canonical artifact bundle', () => {
        const dir = path.join(tmpRoot, 'fallback');
        fs.mkdirSync(path.join(dir, 'app', 'domain'), { recursive: true });
        writePackage(dir, 'fallback-smoke');
        fs.writeFileSync(path.join(dir, 'app', 'domain', 'model.ts'), 'export const model = 1;\n');
        fs.writeFileSync(path.join(dir, 'app', 'main.ts'), 'import { model } from "./domain/model"; export const main = model;\n');
        installPacked(dir);
        const output = execSync('npx maritime analyze --source app --output .maritime', { cwd: dir, encoding: 'utf8' });
        expect(output).toContain('Dependency-Cruiser Config Source: fallback');
        for (const file of ['dependency-graph.json', 'complexity-metrics.json', 'complexity-report.md', 'manifest.json']) {
            expect(fs.existsSync(path.join(dir, '.maritime', file))).toBe(true);
        }
        expect(execSync('npx maritime validate .maritime', { cwd: dir, encoding: 'utf8' })).toContain('Artifact Directory Contract Validated!');
    }, 60000);

    it.each([
        ['CJS', 'config/dependency-cruiser.cjs', 'module.exports = { options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true } };\n'],
        ['ESM', 'dependency-cruiser.config.mjs', 'export default { options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true } };\n']
    ])('explicit %s dependency-cruiser config remains consumer-controlled', (_kind, configPath, configSource) => {
        const dir = path.join(tmpRoot, `explicit-${_kind.toLowerCase()}`);
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
        fs.mkdirSync(path.dirname(path.join(dir, configPath)), { recursive: true });
        writePackage(dir, `explicit-${_kind.toLowerCase()}`);
        fs.writeFileSync(path.join(dir, configPath), configSource);
        fs.writeFileSync(path.join(dir, 'src', 'util.ts'), 'export const util = 1;\n');
        fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'import { util } from "./util"; export const index = util;\n');
        installPacked(dir);
        const output = execSync(`npx maritime analyze --source src --output .maritime --depcruise-config ${configPath}`, { cwd: dir, encoding: 'utf8' });
        expect(output).toContain('Dependency-Cruiser Config Source: explicit');
        expect(fs.existsSync(path.join(dir, '.maritime', 'dependency-graph.json'))).toBe(true);
    }, 60000);

    it('generated multi-root analysis includes every selected root and excludes unrelated trees', () => {
        const dir = path.join(tmpRoot, 'multi-root');
        for (const root of ['app', 'components', 'lib', 'outside']) fs.mkdirSync(path.join(dir, root), { recursive: true });
        fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
        writePackage(dir, 'multi-root');
        fs.writeFileSync(path.join(dir, 'config', 'dependency-cruiser.cjs'), 'module.exports = { options: { doNotFollow: { path: "node_modules" } } };\n');
        fs.writeFileSync(path.join(dir, 'lib', 'math.ts'), 'export const math = 1;\n');
        fs.writeFileSync(path.join(dir, 'components', 'card.tsx'), 'import { math } from "../lib/math"; export const card = math;\n');
        fs.writeFileSync(path.join(dir, 'app', 'page.tsx'), 'import { card } from "../components/card"; export const page = card;\n');
        fs.writeFileSync(path.join(dir, 'components', 'standalone.tsx'), 'export const standalone = 1;\n');
        fs.writeFileSync(path.join(dir, 'lib', 'standalone.ts'), 'export const standalone = 1;\n');
        fs.writeFileSync(path.join(dir, 'outside', 'ignored.ts'), 'export const ignored = 1;\n');
        installPacked(dir);
        execSync('npx maritime analyze --source app --source components --source lib --output .maritime --depcruise-config config/dependency-cruiser.cjs --fail-on-unmeasured', { cwd: dir, stdio: 'pipe' });
        const metrics = JSON.parse(fs.readFileSync(path.join(dir, '.maritime', 'complexity-metrics.json'), 'utf8')) as Record<string, unknown>;
        for (const file of ['app/page.tsx', 'components/card.tsx', 'components/standalone.tsx', 'lib/math.ts', 'lib/standalone.ts']) expect(metrics[file]).toBeDefined();
        expect(metrics['outside/ignored.ts']).toBeUndefined();
    }, 60000);

    it('stages a supplied graph into output without mutating the original', () => {
        const dir = path.join(tmpRoot, 'supplied');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'outside'), { recursive: true });
        writePackage(dir, 'supplied');
        fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
        const original = JSON.stringify({ modules: [{ source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }], summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} } }, null, 2);
        const graphPath = path.join(dir, 'outside', 'graph.json'); fs.writeFileSync(graphPath, original);
        installPacked(dir);
        const output = execSync('npx maritime analyze --graph outside/graph.json --output .maritime', { cwd: dir, encoding: 'utf8' });
        expect(output).toContain('Staging supplied graph into artifact directory');
        expect(fs.readFileSync(graphPath, 'utf8')).toBe(original);
        expect(fs.existsSync(path.join(dir, '.maritime', 'graph.json'))).toBe(true);
    }, 60000);

    it('validate rejects manifest path traversal', () => {
        const dir = path.join(tmpRoot, 'escape'); const maritime = path.join(dir, '.maritime');
        fs.mkdirSync(maritime, { recursive: true }); writePackage(dir, 'escape');
        fs.writeFileSync(path.join(maritime, 'complexity-metrics.json'), '{}');
        fs.writeFileSync(path.join(maritime, 'complexity-report.md'), '# Report');
        fs.writeFileSync(path.join(dir, 'outside.json'), JSON.stringify({ modules: [], summary: { error: 0, ignore: 0, info: 0, totalCruised: 0, violations: [], warn: 0, optionsUsed: {} } }));
        fs.writeFileSync(path.join(maritime, 'manifest.json'), JSON.stringify({
            schemaVersion: '1.0.0', toolVersion: '0.0.0', generatedAt: new Date().toISOString(), sourceRoots: ['src'],
            artifacts: { graph: '../outside.json', metrics: 'complexity-metrics.json', report: 'complexity-report.md' },
            summary: { totalFiles: 0, healthScore: 100, scannedCount: 0, skippedCount: 0 }
        }));
        execSync(`npm install "${tarballPath}" --no-save --omit=peer`, { cwd: dir, stdio: 'pipe' });
        let output = '';
        try { execSync('npx maritime validate .maritime', { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); }
        catch (error) { const e = error as { stdout?: string; stderr?: string }; output = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
        expect(output).toContain('escapes the artifact directory');
    }, 60000);

    it('programmatic API supports multiple source roots', () => {
        const dir = path.join(tmpRoot, 'programmatic');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true }); fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
        writePackage(dir, 'programmatic');
        fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n'); fs.writeFileSync(path.join(dir, 'lib', 'b.ts'), 'export const b = 2;\n');
        fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify({ modules: [
            { source: 'src/a.ts', valid: true, dependencies: [], dependents: [] }, { source: 'lib/b.ts', valid: true, dependencies: [], dependents: [] }
        ], summary: { error: 0, ignore: 0, info: 0, totalCruised: 2, violations: [], warn: 0, optionsUsed: {} } }));
        installPacked(dir);
        fs.writeFileSync(path.join(dir, 'run.js'), `import { analyzeProject } from '@dependency-maritime/cli'; process.exit(await analyzeProject({ source:['src','lib'], graph:'graph.json', metrics:'metrics.json', report:'report.md' }));`);
        execSync('node run.js', { cwd: dir, stdio: 'pipe' });
        expect(fs.existsSync(path.join(dir, 'metrics.json'))).toBe(true);
    }, 60000);

    it('missing ESLint peer dependency fails actionably', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-no-eslint-'));
        try {
            fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'no-eslint', version: '1.0.0', type: 'module' }));
            fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
            fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify({ modules: [{ source: 'src/index.ts', valid: true, dependencies: [], dependents: [] }], summary: { error: 0, ignore: 0, info: 0, totalCruised: 1, violations: [], warn: 0, optionsUsed: {} } }));
            execSync(`npm install "${tarballPath}" --no-save --omit=peer`, { cwd: dir, stdio: 'pipe' });
            fs.rmSync(path.join(dir, 'node_modules', 'eslint'), { recursive: true, force: true });
            let output = '';
            try { execSync('npx maritime analyze --graph graph.json --metrics metrics.json --report report.md', { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); }
            catch (error) { const e = error as { stdout?: string; stderr?: string }; output = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
            expect(output).toContain('requires ESLint 9+ as a peer dependency');
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }, 60000);

    it('composite action declares standardized graph controls', () => {
        const action = fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8');
        for (const input of ['graph-profile', 'module-aggregation', 'aggregation-depth', 'visual-theme', 'source-root-grouping', 'edge-presentation', 'cluster-ranking']) {
            expect(action).toContain(`${input}:`);
        }
        expect(action).toContain('architecture-overview');
        expect(action).toContain('@dependency-maritime/cli@0.1.0-beta.4');
    });

    it('executable composite action analysis path works in a clean consumer', () => {
        const dir = path.join(tmpRoot, 'action-consumer');
        fs.mkdirSync(path.join(dir, 'src'), { recursive: true }); fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
        writePackage(dir, 'action-consumer');
        fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'import { helper } from "../lib/helper"; export const app = helper;\n');
        fs.writeFileSync(path.join(dir, 'lib', 'helper.ts'), 'export const helper = 1;\n');
        const parsed = (yaml as unknown as { load(value: string): { runs: { steps: Array<{ run?: string }> } } }).load(fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8'));
        const runBlocks = parsed.runs.steps.map(step => step.run).filter((run): run is string => Boolean(run));
        const envFile = path.join(dir, 'github_env'); fs.writeFileSync(envFile, '');
        fs.writeFileSync(path.join(dir, 'run.sh'), `set -e\nexport GITHUB_ENV="${envFile}"\n${runBlocks[0]}\nset -a; . "$GITHUB_ENV"; set +a\n${runBlocks[1]}\nset -a; . "$GITHUB_ENV"; set +a\n${runBlocks[2]}\n`);
        const output = execSync('bash run.sh', { cwd: dir, env: {
            ...process.env, INPUT_CLI_SOURCE: '', MARITIME_CLI_TEST_SOURCE: tarballPath,
            INPUT_SOURCE_ROOTS: 'src lib', INPUT_OUTPUT_DIR: '.maritime', INPUT_FAIL_ON_UNMEASURED: 'true'
        }, encoding: 'utf8' });
        expect(output).toContain('Artifact Directory Contract Validated!');
        expect(fs.existsSync(path.join(dir, '.maritime', 'manifest.json'))).toBe(true);
    }, 60000);
});
