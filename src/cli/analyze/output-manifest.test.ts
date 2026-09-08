import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { writeAnalysisOutputs } from './output-manifest';
import * as adapters from './adapters';
import { ValidationError, type AnalysisResult, type AnalysisThresholds } from './models';
import type { ArtifactManifest } from '../../schema/manifest';

const thresholds: AnalysisThresholds = { loc: 300, complexity: 10, fanOut: 15 };
const analysisResult: AnalysisResult = {
    files: [{
        file: 'src/a.ts', loc: 100, complexity: 5, fanIn: 1, fanOut: 2,
        instability: 0.67, score: 33.4, scanned: true
    }],
    healthScore: 100,
    topByScore: [],
    topByComplexity: [],
    skippedCount: 0,
    unmeasuredFiles: []
};

describe('writeAnalysisOutputs', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(adapters, 'writeOutputFiles').mockResolvedValue(undefined);
    });

    afterEach(() => vi.restoreAllMocks());

    it('preserves debt, impact, and namespace contracts while writing the manifest', async () => {
        await writeAnalysisOutputs({
            analysisResult,
            thresholds,
            normalizedSources: ['src'],
            effectiveGraphPath: '/project/.maritime/dependency-graph.json',
            targetMetricsPath: '.maritime/complexity-metrics.json',
            targetReportPath: '.maritime/complexity-report.md',
            manifestDir: '/project/.maritime',
            workingDir: '/project',
            debtEvaluation: {
                baselineCount: 2,
                existingDebtCount: 1,
                newViolationCount: 1,
                resolvedCount: 1,
                violations: []
            },
            impactEvaluation: {
                baseRevision: 'origin/main',
                gitChangedFiles: ['src/a.ts', 'README.md'],
                directlyChangedFiles: ['src/a.ts'],
                transitivelyAffectedFiles: ['src/b.ts'],
                affectedFolders: ['src'],
                impactRatio: 0.5
            },
            namespaceMetrics: [{
                folder: 'src', moduleCount: 2, afferentCoupling: 0,
                efferentCoupling: 1, instability: 1
            }]
        });

        const calls = vi.mocked(adapters.writeOutputFiles).mock.calls[0];
        const manifest = calls[5] as ArtifactManifest;
        expect(manifest.artifacts).toEqual({
            graph: 'dependency-graph.json',
            metrics: 'complexity-metrics.json',
            report: 'complexity-report.md'
        });
        expect(manifest.summary.architectureDebt).toEqual({
            baselineCount: 2,
            existingDebtCount: 1,
            newViolationCount: 1,
            resolvedCount: 1
        });
        expect(manifest.summary.changeImpact).toMatchObject({
            directlyChangedCount: 1,
            gitChangedCount: 2,
            directlyChangedGraphCount: 1,
            transitiveImpactCount: 1,
            affectedFolderCount: 1,
            impactRatio: 0.5
        });
        expect(manifest.summary.architecture.namespaces).toHaveLength(1);
        expect(calls[3]).toContain('Architecture Debt Summary');
        expect(calls[3]).toContain('PR / Change Impact Surface');
    });

    it('rejects artifacts outside the manifest directory', async () => {
        await expect(writeAnalysisOutputs({
            analysisResult,
            thresholds,
            normalizedSources: ['src'],
            effectiveGraphPath: path.resolve('/project/outside.json'),
            targetMetricsPath: '.maritime/complexity-metrics.json',
            targetReportPath: '.maritime/complexity-report.md',
            manifestDir: '/project/.maritime',
            workingDir: '/project',
            namespaceMetrics: []
        })).rejects.toThrow(ValidationError);
    });
});
