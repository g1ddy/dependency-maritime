import { readBaselineFile, writeBaselineFile, evaluateArchitectureDebt, type ArchitectureDebtAnalysis, type ViolationInput } from './architecture-debt';
import { calculateChangeImpact, type ImpactAnalysisResult } from './impact';
import { ValidationError, type DependencyCruiserModule } from './models';

export interface EvaluateArchitectureAnalysisOptions {
    violations: ViolationInput[];
    modules: DependencyCruiserModule[];
    baselinePath?: string;
    writeBaselinePath?: string;
    failOnNewViolations?: boolean;
    baseRevision?: string;
    workingDir: string;
}

export interface ArchitectureAnalysisResult {
    debtEvaluation?: ArchitectureDebtAnalysis;
    impactEvaluation?: ImpactAnalysisResult;
}

export async function evaluateArchitectureAnalysis(
    options: EvaluateArchitectureAnalysisOptions
): Promise<ArchitectureAnalysisResult> {
    let debtEvaluation: ArchitectureDebtAnalysis | undefined;

    if (options.baselinePath) {
        console.log(`   - Evaluating Architecture Debt against baseline: ${options.baselinePath}`);
        const baseline = await readBaselineFile(options.baselinePath, options.workingDir);
        debtEvaluation = evaluateArchitectureDebt(options.violations, baseline);
    } else if (options.violations.length > 0) {
        debtEvaluation = evaluateArchitectureDebt(options.violations);
    }

    if (debtEvaluation && options.failOnNewViolations && debtEvaluation.newViolationCount > 0) {
        throw new ValidationError(
            `Analysis failed because ${debtEvaluation.newViolationCount} new architecture violation(s) were introduced (--fail-on-new-violations).`
        );
    }

    if (options.writeBaselinePath) {
        console.log(`   - Writing Architecture Debt baseline to: ${options.writeBaselinePath}`);
        await writeBaselineFile(options.writeBaselinePath, options.violations, options.workingDir);
    }

    let impactEvaluation: ImpactAnalysisResult | undefined;
    if (options.baseRevision) {
        console.log(`   - Evaluating PR Change Impact relative to base revision: ${options.baseRevision}`);
        impactEvaluation = calculateChangeImpact(options.modules, {
            baseRevision: options.baseRevision,
            cwd: options.workingDir
        });
    }

    return { debtEvaluation, impactEvaluation };
}
