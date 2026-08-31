import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const workflowPath = path.join(process.cwd(), '.github/workflows/update-maritime-evidence.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

describe('Maritime evidence workflow contract', () => {
    it('uses the required caller-owned triggers and non-cancelling concurrency', () => {
        expect(workflow).toContain('types: [opened, reopened, synchronize]');
        expect(workflow).not.toContain('labeled');
        expect(workflow).toContain("- 'src/**'");
        expect(workflow).toContain("- '.github/workflows/update-maritime-evidence.yml'");
        expect(workflow).toContain('workflow_dispatch:');
        expect(workflow).toContain('group: maritime-evidence-${{ github.event.pull_request.number || github.ref }}');
        expect(workflow).toContain('cancel-in-progress: false');
    });

    it('verifies the exact checkout with read-only permissions and the local built CLI', () => {
        expect(workflow).toContain('ref: ${{ github.event.pull_request.head.sha || github.sha }}');
        expect(workflow).toContain('permissions:\n      contents: read');
        expect(workflow).toContain('run: npm run build:cli');
        expect(workflow).toContain('uses: ./');
        expect(workflow).toContain("cli-source: '.'");
        expect(workflow).toContain('run: node scripts/check-maritime-evidence.mjs');
        expect(workflow).toContain('uses: actions/upload-artifact@v4');
    });

    it('gates writes by changes, PR origin, and the approval environment', () => {
        expect(workflow).toContain("needs.verify-evidence.outputs.changed == 'true'");
        expect(workflow).toContain("github.event_name == 'pull_request'");
        expect(workflow).toContain('github.event.pull_request.head.repo.full_name == github.repository');
        expect(workflow).toContain('environment: generated-evidence-write');
        expect(workflow).toContain('permissions:\n      contents: write');
    });

    it('stages, audits, and pushes only the approved generated paths', () => {
        expect(workflow).toContain("git add -- .maritime docs/images/dependency-graph.svg");
        expect(workflow).toContain("sed -E '/^(\\.maritime\\/|docs\\/images\\/dependency-graph\\.svg$)/d'");
        expect(workflow).toContain('git push origin "HEAD:refs/heads/$HEAD_BRANCH"');
        expect(workflow).not.toContain('git-auto-commit-action');
    });
});
