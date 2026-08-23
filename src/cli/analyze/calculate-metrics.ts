import type { FileMetric, AnalysisThresholds, AnalysisResult, DependencyCruiserModule, EslintFileComplexity } from './models';

export function calculateInstability(fanIn: number, fanOut: number): number {
    if (fanIn + fanOut === 0) {
        return 0;
    }
    return fanOut / (fanIn + fanOut);
}

export function calculateScore(loc: number, complexity: number, fanOut: number, instability: number): number {
    return (loc / 10) + (complexity * 2) + (fanOut * 2) + (instability * 20);
}

export function calculateHealthScore(files: FileMetric[], thresholds: AnalysisThresholds): number {
    let score = 100;

    for (const f of files) {
        if (f.loc > thresholds.loc) score -= 1;
        if (f.complexity > thresholds.complexity) score -= 1;
        if (f.fanOut > thresholds.fanOut) score -= 1;
    }

    return Math.max(0, Math.min(100, score));
}

export function calculateMetrics(
    modules: DependencyCruiserModule[],
    locMap: Record<string, number>,
    complexityMap: Record<string, EslintFileComplexity | number>,
    thresholds: AnalysisThresholds,
    sourcePrefix: string = 'src'
): AnalysisResult {
    // Source prefix is already expected to be normalized from CLI, but we ensure basic boundaries here.
    const normalizedPrefix = sourcePrefix === '.' ? '' : sourcePrefix.replace(/\/+$/, '');
    const prefixBoundary = normalizedPrefix ? `${normalizedPrefix}/` : '';

    const files: FileMetric[] = modules
        .filter(m => {
            const isSource = normalizedPrefix === ''
                ? true
                : m.source === normalizedPrefix || m.source.startsWith(prefixBoundary);
            return isSource && !m.source.includes('.test.') && !m.source.includes('.d.ts');
        })
        .map(m => {
            const loc = locMap[m.source] || 0;
            const fanOut = m.dependencies.length;
            const fanIn = m.dependents.length;

            const instability = calculateInstability(fanIn, fanOut);

            let complexity = 0;
            let scanned = false;

            const eslintData = complexityMap[m.source];
            if (eslintData !== undefined) {
                if (typeof eslintData === 'object' && eslintData !== null) {
                    complexity = eslintData.complexity;
                    scanned = eslintData.scanned;
                } else if (typeof eslintData === 'number') {
                    complexity = eslintData;
                    scanned = true;
                }
            }

            const score = calculateScore(loc, complexity, fanOut, instability);

            return {
                file: m.source,
                loc,
                fanOut,
                fanIn,
                instability: parseFloat(instability.toFixed(2)),
                complexity,
                score: parseFloat(score.toFixed(1)),
                scanned
            };
        });

    const healthScore = calculateHealthScore(files, thresholds);

    const unmeasuredFiles = files.filter(f => !f.scanned).map(f => f.file);
    const skippedCount = unmeasuredFiles.length;

    // Create stable sorts to break ties by file name
    const topByScore = [...files].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.file.localeCompare(b.file);
    }).slice(0, 10);

    const topByComplexity = [...files].sort((a, b) => {
        if (b.complexity !== a.complexity) return b.complexity - a.complexity;
        return a.file.localeCompare(b.file);
    }).slice(0, 10);

    return {
        files,
        healthScore: parseFloat(healthScore.toFixed(1)),
        topByScore,
        topByComplexity,
        skippedCount,
        unmeasuredFiles
    };
}
