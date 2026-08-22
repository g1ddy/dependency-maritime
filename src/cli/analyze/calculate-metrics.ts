import type { FileMetric, AnalysisThresholds, AnalysisResult, DependencyCruiserModule } from './models';

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
    complexityMap: Record<string, number>,
    thresholds: AnalysisThresholds,
    sourcePrefix: string = 'src'
): AnalysisResult {

    const files: FileMetric[] = modules
        .filter(m => m.source.startsWith(sourcePrefix) && !m.source.includes('.test.') && !m.source.includes('.d.ts'))
        .map(m => {
            const loc = locMap[m.source] || 0;
            const fanOut = m.dependencies.length;
            const fanIn = m.dependents.length;

            const instability = calculateInstability(fanIn, fanOut);
            const complexity = complexityMap[m.source] || 1;

            const score = calculateScore(loc, complexity, fanOut, instability);

            return {
                file: m.source,
                loc,
                fanOut,
                fanIn,
                instability: parseFloat(instability.toFixed(2)),
                complexity,
                score: parseFloat(score.toFixed(1))
            };
        });

    const healthScore = calculateHealthScore(files, thresholds);

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
        topByComplexity
    };
}
