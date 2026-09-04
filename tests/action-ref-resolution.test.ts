import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

type ActionStep = { name?: string; run?: string };
type CompositeAction = { runs: { steps: ActionStep[] } };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isActionStep = (value: unknown): value is ActionStep => isRecord(value)
    && (value.name === undefined || typeof value.name === 'string')
    && (value.run === undefined || typeof value.run === 'string');
const isCompositeAction = (value: unknown): value is CompositeAction => isRecord(value) && isRecord(value.runs)
    && Array.isArray(value.runs.steps) && value.runs.steps.every(isActionStep);

describe('composite action release tag resolution', () => {
    it('keeps rendering opt-in and exposes every graph presentation override with empty defaults', () => {
        const actionYaml = fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8');
        const parsed = yaml.load(actionYaml) as { inputs: Record<string, { default?: string }> };
        expect(parsed.inputs['render-graph']?.default).toBe('false');
        expect(parsed.inputs['graph-output']?.default).toBe('docs/images/dependency-graph.svg');
        for (const input of [
            'graph-profile', 'external-packages', 'folder-grouping', 'module-aggregation', 'aggregation-depth',
            'edge-labels', 'layout-direction', 'rank-constraints', 'layout-density', 'visual-theme',
            'source-root-grouping', 'edge-presentation', 'cluster-ranking'
        ]) expect(parsed.inputs[input]?.default).toBe('');
        expect(actionYaml).toContain('$MARITIME_BIN graph "${GRAPH_ARGS[@]}"');
        expect(actionYaml).toContain("ubuntu-graphviz-version: '2.42.2-9ubuntu0.1'");
        expect(actionYaml).toContain('@dependency-maritime/cli@0.1.0-beta.4');
        expect(actionYaml).toContain('architecture-overview');
        expect(actionYaml).toContain('if [ -n "$INPUT_VISUAL_THEME" ]; then');
        expect(actionYaml).toContain('if [ -n "$INPUT_SOURCE_ROOT_GROUPING" ]; then');
        expect(actionYaml).toContain('if [ -n "$INPUT_EDGE_PRESENTATION" ]; then');
        expect(actionYaml).toContain('if [ -n "$INPUT_CLUSTER_RANKING" ]; then');
        expect(actionYaml).toContain('if [ -n "$INPUT_AGGREGATION_DEPTH" ]; then');
    });

    it('pairs the tag-triggered release smoke with the just-published CLI version', () => {
        const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/publish-cli-prerelease.yml'), 'utf8');
        expect(workflow).toContain("cli-source: '@dependency-maritime/cli@${{ needs.publish.outputs.cli-version }}'");
        expect(workflow).toContain("render-graph: 'true'");
        expect(workflow).toContain('test -f docs/images/dependency-graph.svg');
    });

    it('gates main release tagging on the reusable CLI contract workflow', () => {
        const ciWorkflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
        const contractWorkflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/cli-contract.yml'), 'utf8');
        expect(contractWorkflow).toContain('workflow_call:');
        expect(ciWorkflow).toContain('uses: ./.github/workflows/cli-contract.yml');
        expect(ciWorkflow).toContain('needs: cli-contract');
        expect(ciWorkflow).toContain("needs.cli-contract.result == 'success'");
    });

    it('derives the CLI package version from a cli-v action ref when cli-source is unset', () => {
        const actionYaml = fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8');
        const parsedAction: unknown = yaml.load(actionYaml);
        expect(isCompositeAction(parsedAction)).toBe(true);
        if (!isCompositeAction(parsedAction)) throw new Error('action.yml does not match the expected composite action shape');
        const installStep = parsedAction.runs.steps.find(step => step.name === 'Install and Resolve Maritime CLI');
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-action-ref-'));
        const mockBinDir = path.join(tmpDir, 'bin');
        const npmCallLog = path.join(tmpDir, 'npm-calls.log');
        const githubEnv = path.join(tmpDir, 'github-env');
        fs.mkdirSync(mockBinDir, { recursive: true }); fs.writeFileSync(githubEnv, '');
        const mockNpmPath = path.join(mockBinDir, 'npm');
        fs.writeFileSync(mockNpmPath, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$NPM_CALL_LOG"
case "$1" in
  view) printf '9.8.7-beta.6\\n' ;;
  install) mkdir -p node_modules/.bin; printf '#!/usr/bin/env bash\\nexit 0\\n' > node_modules/.bin/maritime; chmod +x node_modules/.bin/maritime ;;
  *) exit 1 ;;
esac
`);
        fs.chmodSync(mockNpmPath, 0o755);
        fs.writeFileSync(path.join(tmpDir, 'resolve-action-ref.sh'), installStep?.run ?? 'exit 1');
        try {
            const output = execSync('bash resolve-action-ref.sh', { cwd: tmpDir, env: {
                ...process.env, PATH: `${mockBinDir}:${process.env.PATH ?? ''}`, INPUT_CLI_SOURCE: '',
                ACTION_REF: 'cli-v9.8.7-beta.6', MARITIME_CLI_TEST_SOURCE: '', GITHUB_ENV: githubEnv, NPM_CALL_LOG: npmCallLog
            }, encoding: 'utf8' });
            expect(output).toContain('Resolving Maritime CLI from: @dependency-maritime/cli@9.8.7-beta.6');
            expect(fs.readFileSync(npmCallLog, 'utf8')).toContain('view @dependency-maritime/cli@9.8.7-beta.6 version');
            expect(fs.readFileSync(githubEnv, 'utf8')).toContain('MARITIME_BIN=./node_modules/.bin/maritime');
        } finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
    });
});
