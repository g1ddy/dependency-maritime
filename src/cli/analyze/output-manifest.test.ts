import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import { writeAnalysisOutputs } from './output-manifest';
import * as adapters from './adapters';
import { ValidationError, type AnalysisResult, type AnalysisThresholds } from './models';
import type { ArtifactManifest } from '../../schema/manifest';

describe('writeAnalysisOutputs', () => {
    const workingDir = '/project';
    const manifestDir = '/project/.maritime';
    const thresholds: AnalysisThresholds = { loc: 300, complexity: 10, fanOut: 15 };

    const mockAnalysisResult: AnalysisResult = {
        files: [
            {
                file: 'src/a.ts',
                loc: 100,
                complexity: 5,
                fanIn: 1,
                fanOut: 2,
                instability: 0.67,
                score: 33.4,
                scanned: true
            }
        ],
        healthScore: 100,
        topByScore: [],
        topByComplexity: [],
        skippedCount: 0,
        unmeasuredFiles: []
    };

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(adapters, 'writeOutputFiles').mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('builds manifest and writes output files correctly when paths are inside manifest directory', async () => {
        await writeAnalysisOutputs({
            analysisResult: mockAnalysisResult,
            thresholds,
            normalizedSources: ['src'],
            effectiveGraphPath: path.resolve(workingDir, '.maritime/dependency-graph.json'),
            targetMetricsPath: '.maritime/complexity-metrics.json',
            targetReportPath: '.maritime/complexity-report.md',
            manifestDir,
            workingDir
        });

        expect(adapters.writeOutputFiles).toHaveBeenCalledTimes(1);
        const calls = vi.mocked(adapters.writeOutputFiles).mock.calls[0];
        expect(calls[0]).toBe('.maritime/complexity-metrics.json');
        expect(calls[1]).toEqual({
            'src/a.ts': {
                complexity: 5,
                loc: 100,
                instability: 0.67,
                fanIn: 1,
                fanOut: 2,
                scanned: true
            }
        });
        expect(calls[2]).toBe('.maritime/complexity-report.md');
        expect(calls[3]).toContain('Automated Complexity Report');
        expect(calls[4]).toBe('.maritime/manifest.json');
        const manifest = calls[5] as ArtifactManifest;
        expect(manifest.schemaVersion).toBe('1.0.0');
        expect(manifest.artifacts.graph).toBe('dependency-graph.json');
        expect(manifest.artifacts.metrics).toBe('complexity-metrics.json');
        expect(manifest.artifacts.report).toBe('complexity-report.md');
        expect(manifest.summary).toEqual({
            totalFiles: 1,
            healthScore: 100,
            scannedCount: 1,
            skippedCount: 0
        });
    });

    it('throws ValidationError when an artifact path escapes the manifest directory', async () => {
        await expect(writeAnalysisOutputs({
            analysisResult: mockAnalysisResult,
            thresholds,
            normalizedSources: ['src'],
            effectiveGraphPath: path.resolve(workingDir, 'outside-graph.json'),
            targetMetricsPath: '.maritime/complexity-metrics.json',
            targetReportPath: '.maritime/complexity-report.md',
            manifestDir,
            workingDir
        })).rejects.toThrow(ValidationError);
    });
});
