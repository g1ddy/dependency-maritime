import { mkdtemp, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { evaluateArchitectureAnalysis } from './architecture-analysis';
import { ValidationError } from './models';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'maritime-architecture-analysis-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('evaluateArchitectureAnalysis', () => {
    const violation = {
        from: 'src/a.ts',
        to: 'src/b.ts',
        rule: { name: 'no-layer-violation', severity: 'error' }
    };

    it('writes an initialization baseline without changing violation semantics', async () => {
        const workingDir = await makeTempDir();
        const result = await evaluateArchitectureAnalysis({
            violations: [violation],
            modules: [],
            writeBaselinePath: '.maritime/baseline.json',
            workingDir
        });

        expect(result.debtEvaluation?.newViolationCount).toBe(1);
        const baseline = JSON.parse(await readFile(path.join(workingDir, '.maritime/baseline.json'), 'utf8'));
        expect(baseline.violations).toEqual([{
            ruleName: 'no-layer-violation',
            severity: 'error',
            from: 'src/a.ts',
            to: 'src/b.ts'
        }]);
    });

    it('fails when fail-on-new-violations observes debt not present in the baseline', async () => {
        const workingDir = await makeTempDir();
        await evaluateArchitectureAnalysis({
            violations: [],
            modules: [],
            writeBaselinePath: '.maritime/baseline.json',
            workingDir
        });

        await expect(evaluateArchitectureAnalysis({
            violations: [violation],
            modules: [],
            baselinePath: '.maritime/baseline.json',
            failOnNewViolations: true,
            workingDir
        })).rejects.toBeInstanceOf(ValidationError);
    });
});
