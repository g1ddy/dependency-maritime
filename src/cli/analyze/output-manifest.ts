import * as path from 'node:path';
import { renderMarkdownReport } from './render-markdown-report';
import { getToolVersion, writeOutputFiles } from './adapters';
import { ValidationError, type AnalysisResult, type AnalysisThresholds } from './models';
import { MANIFEST_SCHEMA_VERSION, type ArtifactManifest } from '../../schema/manifest';

export interface WriteAnalysisOutputsOptions {
    analysisResult: AnalysisResult;
    thresholds: AnalysisThresholds;
    normalizedSources: string[];
    effectiveGraphPath: string;
    targetMetricsPath: string;
    targetReportPath: string;
    manifestDir: string;
    workingDir: string;
}

export async function writeAnalysisOutputs(options: WriteAnalysisOutputsOptions): Promise<void> {
    const {
        analysisResult,
        thresholds,
        normalizedSources,
        effectiveGraphPath,
        targetMetricsPath,
        targetReportPath,
        manifestDir,
        workingDir
    } = options;

    console.log('   - Generating Outputs...');

    const metricsMap = analysisResult.files.reduce((acc, f) => {
        acc[f.file] = {
            complexity: f.complexity,
            loc: f.loc,
            instability: f.instability,
            fanIn: f.fanIn,
            fanOut: f.fanOut,
            scanned: f.scanned
        };
        return acc;
    }, {} as Record<string, unknown>);

    const reportContent = renderMarkdownReport(analysisResult, thresholds);

    const targetManifestPath = path.relative(workingDir, path.join(manifestDir, 'manifest.json')).replace(/\\/g, '/');

    const relGraph = path.relative(manifestDir, effectiveGraphPath).replace(/\\/g, '/');
    const relMetrics = path.relative(manifestDir, path.resolve(workingDir, targetMetricsPath)).replace(/\\/g, '/');
    const relReport = path.relative(manifestDir, path.resolve(workingDir, targetReportPath)).replace(/\\/g, '/');

    const artifactRelPaths = { graph: relGraph, metrics: relMetrics, report: relReport };
    for (const [key, relPath] of Object.entries(artifactRelPaths)) {
        if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
            throw new ValidationError(`Manifest artifact path for "${key}" escapes the artifact directory: "${relPath}"`);
        }
    }

    const manifest: ArtifactManifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        toolVersion: getToolVersion(),
        generatedAt: new Date().toISOString(),
        sourceRoots: normalizedSources,
        artifacts: {
            graph: relGraph,
            metrics: relMetrics,
            report: relReport
        },
        summary: {
            totalFiles: analysisResult.files.length,
            healthScore: analysisResult.healthScore,
            scannedCount: analysisResult.files.filter(f => f.scanned).length,
            skippedCount: analysisResult.skippedCount
        }
    };

    await writeOutputFiles(
        targetMetricsPath,
        metricsMap,
        targetReportPath,
        reportContent,
        targetManifestPath,
        manifest,
        workingDir
    );
}
