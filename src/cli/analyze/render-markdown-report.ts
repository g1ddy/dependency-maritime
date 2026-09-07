import type { AnalysisResult, AnalysisThresholds, FileMetric } from './models';
import type { NamespaceMetric } from './calculate-metrics';

function escapeMarkdown(text: string): string {
    return text.replace(/_/g, '\\_').replace(/\*/g, '\\*');
}

export interface DebtReportData {
    baselineCount: number;
    existingDebtCount: number;
    newViolationCount: number;
    resolvedCount: number;
}

export interface ImpactReportData {
    baseRevision: string | null;
    gitChangedCount: number;
    directlyChangedGraphCount: number;
    transitiveImpactCount: number;
    affectedFolderCount: number;
    impactRatio: number;
}

export function renderMarkdownReport(
    result: AnalysisResult,
    thresholds: AnalysisThresholds,
    date: Date = new Date(),
    debtData?: DebtReportData,
    impactData?: ImpactReportData,
    namespaces?: NamespaceMetric[]
): string {
    const dateString = date.toISOString().split('T')[0];

    const healthScoreFormatted = result.healthScore.toFixed(1);
    const totalFiles = result.files.length;
    const measuredFiles = result.files.filter(f => f.scanned).length;
    const unmeasuredFilesCount = result.skippedCount;

    const scoreTableRows = result.topByScore.map((f: FileMetric) =>
        `| \`${escapeMarkdown(f.file)}\` | **${f.score}** | ${f.loc} | ${f.complexity} | ${f.fanOut} | ${f.instability} |`
    ).join('\n');

    const complexityTableRows = result.topByComplexity.map((f: FileMetric) =>
        `| \`${escapeMarkdown(f.file)}\` | **${f.complexity}** | ${f.loc} |`
    ).join('\n');

    let skippedSection = '';
    if (unmeasuredFilesCount > 0 && result.unmeasuredFiles.length > 0) {
        const fileList = result.unmeasuredFiles.map(f => `- \`${escapeMarkdown(f)}\``).join('\n');
        skippedSection = `\n\n### ⚠️ Skipped / Unmeasured Files (${unmeasuredFilesCount})\n${fileList}`;
    }

    let debtSection = '';
    if (debtData) {
        debtSection = `
### 🏛️ Architecture Debt Summary
* **Baseline Violations**: ${debtData.baselineCount}
* **Existing Debt**: ${debtData.existingDebtCount}
* **New Violations**: ${debtData.newViolationCount}
* **Resolved Violations**: ${debtData.resolvedCount}
`;
    }

    let impactSection = '';
    if (impactData) {
        impactSection = `
### 🎯 PR / Change Impact Surface
* **Base Revision**: \`${impactData.baseRevision || 'N/A'}\`
* **Git Changed Files**: ${impactData.gitChangedCount}
* **Directly Changed Graph Modules**: ${impactData.directlyChangedGraphCount}
* **Transitively Affected Graph Modules**: ${impactData.transitiveImpactCount}
* **Impacted Architectural Folders**: ${impactData.affectedFolderCount}
* **Repository Impact Surface**: ${(impactData.impactRatio * 100).toFixed(1)}%
`;
    }

    let namespaceSection = '';
    if (namespaces && namespaces.length > 0) {
        const rows = namespaces.map(ns =>
            `| \`${escapeMarkdown(ns.folder)}\` | ${ns.moduleCount} | ${ns.afferentCoupling} ($C_a$) | ${ns.efferentCoupling} ($C_e$) | **${ns.instability}** |`
        ).join('\n');

        namespaceSection = `
### 📐 Architectural Folder Coupling & Instability Metrics
| Folder / Namespace | Modules | Afferent ($C_a$) | Efferent ($C_e$) | Instability ($I$) |
| :--- | :--- | :--- | :--- | :--- |
${rows}
`;
    }

    return `
## 🚨 Automated Complexity Report
${debtSection}${impactSection}${namespaceSection}

**Last Updated:** ${dateString}

### 🏥 Repository Health Score: **${healthScoreFormatted} / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > ${thresholds.loc}, Complexity > ${thresholds.complexity}, Fan-Out > ${thresholds.fanOut}).
*   **Total Graph Files**: ${totalFiles}
*   **Measured Files**: ${measuredFiles}
*   **Unmeasured Files**: ${unmeasuredFilesCount}

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
${scoreTableRows}

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
${complexityTableRows}${skippedSection}
`.trim() + '\n';
}
