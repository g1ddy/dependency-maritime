export interface FileMetric {
    file: string;
    loc: number;
    complexity: number;
    fanIn: number;
    fanOut: number;
    instability: number;
    score: number;
}

export interface AnalysisThresholds {
    loc: number;
    complexity: number;
    fanOut: number;
    instabilityMin?: number;
    instabilityMax?: number;
}

export interface AnalysisResult {
    files: FileMetric[];
    healthScore: number;
    topByScore: FileMetric[];
    topByComplexity: FileMetric[];
}

export interface EslintMessage {
    ruleId: string;
    message: string;
}

export interface EslintResult {
    filePath: string;
    messages: EslintMessage[];
}

export interface DependencyCruiserModule {
    source: string;
    dependencies: any[];
    dependents: any[];
}
