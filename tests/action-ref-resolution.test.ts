import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';

describe('composite action release tag resolution', () => {
    it('derives the CLI package version from a cli-v action ref when cli-source is unset', () => {
        const actionYaml = fs.readFileSync(path.join(process.cwd(), 'action.yml'), 'utf8');
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
        const actionObj = (yaml as any).load(actionYaml) as {
            runs: { steps: Array<{ name?: string; run?: string }> };
        };
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */

        const installStep = actionObj.runs.steps.find(step => step.name === 'Install and Resolve Maritime CLI');
        expect(installStep?.run).toBeDefined();

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-action-ref-'));
        const mockBinDir = path.join(tmpDir, 'bin');
        const npmCallLog = path.join(tmpDir, 'npm-calls.log');
        const githubEnv = path.join(tmpDir, 'github-env');
        fs.mkdirSync(mockBinDir, { recursive: true });
        fs.writeFileSync(githubEnv, '');

        const mockNpmPath = path.join(mockBinDir, 'npm');
        fs.writeFileSync(
            mockNpmPath,
            `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$NPM_CALL_LOG"
case "$1" in
  view)
    printf '9.8.7-beta.6\\n'
    ;;
  install)
    mkdir -p node_modules/.bin
    cat > node_modules/.bin/maritime <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
    chmod +x node_modules/.bin/maritime
    ;;
  *)
    echo "unexpected npm invocation: $*" >&2
    exit 1
    ;;
esac
`
        );
        fs.chmodSync(mockNpmPath, 0o755);

        const scriptPath = path.join(tmpDir, 'resolve-action-ref.sh');
        fs.writeFileSync(scriptPath, installStep?.run ?? 'exit 1');

        try {
            const output = execSync('bash resolve-action-ref.sh', {
                cwd: tmpDir,
                env: {
                    ...process.env,
                    PATH: `${mockBinDir}:${process.env.PATH ?? ''}`,
                    INPUT_CLI_SOURCE: '',
                    ACTION_REF: 'cli-v9.8.7-beta.6',
                    MARITIME_CLI_TEST_SOURCE: '',
                    npm_lifecycle_event: '',
                    GITHUB_ENV: githubEnv,
                    NPM_CALL_LOG: npmCallLog
                },
                encoding: 'utf8'
            });

            expect(output).toContain('Resolving Maritime CLI from: @dependency-maritime/cli@9.8.7-beta.6');

            const npmCalls = fs.readFileSync(npmCallLog, 'utf8');
            expect(npmCalls).toContain('view @dependency-maritime/cli@9.8.7-beta.6 version');
            expect(npmCalls).toContain('install @dependency-maritime/cli@9.8.7-beta.6 --no-save');

            const persistedEnv = fs.readFileSync(githubEnv, 'utf8');
            expect(persistedEnv).toContain('MARITIME_BIN=./node_modules/.bin/maritime');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
