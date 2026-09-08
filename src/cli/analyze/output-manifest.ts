import * as path from 'node:path';
import { renderMarkdownReport } from './render-markdown-report';
import { getToolVersion, writeOutputFiles } from './adapters';
import { ValidationError, type AnalysisResult, type AnalysisThresholds } from './models';
import type { NamespaceMetric } from './calculate-metrics';
import type { ArchitectureDebtAnalysis } from './architecture-debt';
import type { ImpactAnalysisResult } from './impact';
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
    debtEvaluation?: ArchitectureDebtAnalysis;
    impactEvaluation?: ImpactAnalysisResult;
    namespaceMetrics: NamespaceMetric[];
}

function relativeArtifactPath(manifestDir: string, absolutePath: string, key: string): string {
    const relPath = path.relative(manifestDir, absolutePath).replace(/\\/g, '/');
    if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
        throw new ValidationError(`Manifest artifact path for "${key}" escapes the artifact directory: "${relPath}"`);
    }
    return relPath;
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
        workingDir,
        debtEvaluation,
        impactEvaluation,
        namespaceMetrics
    } = options;

    console.log('   - Generating Outputs...');

    const metricsMap = Object.fromEntries(analysisResult.files.map(file => [file.file, {
        complexity: file.complexity,
        loc: file.loc,
        instability: file.instability,
        fanIn: file.fanIn,
        fanOut: file.fanOut,
        scanned: file.scanned
    }]));

    const reportContent = renderMarkdownReport(
        analysisResult,
        thresholds,
        new Date(),
        debtEvaluation ? {
            baselineCount: debtEvaluation.baselineCount,
            existingDebtCount: debtEvaluation.existingDebtCount,
            newViolationCount: debtEvaluation.newViolationCount,
            resolvedCount: debtEvaluation.resolvedCount
        } : undefined,
        impactEvaluation ? {
            baseRevision: impactEvaluation.baseRevision,
            gitChangedCount: impactEvaluation.gitChangedFiles.length,
            directlyChangedGraphCount: impactEvaluation.directlyChangedFiles.length,
            transitiveImpactCount: impactEvaluation.transitivelyAffectedFiles.length,
            affectedFolderCount: impactEvaluation.affectedFolders.length,
            impactRatio: impactEvaluation.impactRatio
        } : undefined,
        namespaceMetrics
    );

    const targetManifestPath = path.relative(workingDir, path.join(manifestDir, 'manifest.json')).replace(/\\/g, '/');
    const relGraph = relativeArtifactPath(manifestDir, effectiveGraphPath, 'graph');
    const relMetrics = relativeArtifactPath(manifestDir, path.resolve(workingDir, targetMetricsPath), 'metrics');
    const relReport = relativeArtifactPath(manifestDir, path.resolve(workingDir, targetReportPath), 'report');

    const manifest: ArtifactManifest = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        toolVersion: getToolVersion(),
        generatedAt: new Date().toISOString(),
        sourceRoots: normalizedSources,
        artifacts: { graph: relGraph, metrics: relMetrics, report: relReport },
        summary: {
            totalFiles: analysisResult.files.length,
            healthScore: analysisResult.healthScore,
            scannedCount: analysisResult.files.filter(file => file.scanned).length,
            skippedCount: analysisResult.skippedCount,
            ...(debtEvaluation ? {
                architectureDebt: {
                    baselineCount: debtEvaluation.baselineCount,
                    existingDebtCount: debtEvaluation.existingDebtCount,
                    newViolationCount: debtEvaluation.newViolationCount,
                    resolvedCount: debtEvaluation.resolvedCount
                }
            } : {}),
            ...(impactEvaluation ? {
                changeImpact: {
                    baseRevision: impactEvaluation.baseRevision,
                    directlyChangedCount: impactEvaluation.directlyChangedFiles.length,
                    gitChangedCount: impactEvaluation.gitChangedFiles.length,
                    directlyChangedGraphCount: impactEvaluation.directlyChangedFiles.length,
                    transitiveImpactCount: impactEvaluation.transitivelyAffectedFiles.length,
                    affectedFolderCount: impactEvaluation.affectedFolders.length,
                    impactRatio: impactEvaluation.impactRatio
                }
            } : {}),
            architecture: {
                namespaces: namespaceMetrics
            }
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
