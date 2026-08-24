export interface FileMetric {
    file: string;
    loc: number;
    complexity: number;
    fanIn: number;
    fanOut: number;
    instability: number;
    score: number;
    scanned: boolean;
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
    skippedCount: number;
    unmeasuredFiles: string[];
}

export interface EslintMessage {
    ruleId: string;
    message: string;
    fatal?: boolean;
}

export interface EslintResult {
    filePath: string;
    messages: EslintMessage[];
    ignored?: boolean;
}

export interface EslintFileComplexity {
    complexity: number;
    scanned: boolean;
}

export interface DependencyCruiserModule {
    source: string;
    dependencies: unknown[];
    dependents: unknown[];
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
