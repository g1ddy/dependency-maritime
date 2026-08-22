import type { AnalysisResult, AnalysisThresholds, FileMetric } from './models';

function escapeMarkdown(text: string): string {
    return text.replace(/_/g, '\\_').replace(/\*/g, '\\*');
}

export function renderMarkdownReport(result: AnalysisResult, thresholds: AnalysisThresholds, date: Date = new Date()): string {
    const dateString = date.toISOString().split('T')[0];

    const healthScoreFormatted = result.healthScore.toFixed(1);

    const scoreTableRows = result.topByScore.map((f: FileMetric) =>
        `| \`${escapeMarkdown(f.file)}\` | **${f.score}** | ${f.loc} | ${f.complexity} | ${f.fanOut} | ${f.instability} |`
    ).join('\n');

    const complexityTableRows = result.topByComplexity.map((f: FileMetric) =>
        `| \`${escapeMarkdown(f.file)}\` | **${f.complexity}** | ${f.loc} |`
    ).join('\n');

    return `
## 🚨 Automated Complexity Report

**Last Updated:** ${dateString}

### 🏥 Repository Health Score: **${healthScoreFormatted} / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > ${thresholds.loc}, Complexity > ${thresholds.complexity}, Fan-Out > ${thresholds.fanOut}).
*   **Total Files Scanned**: ${result.files.length}

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
${scoreTableRows}

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
${complexityTableRows}
`.trim() + '\n';
}
