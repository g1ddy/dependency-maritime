import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'path';
import { z } from 'zod';
import { ValidationError } from './models';

export const BaselineViolationSchema = z.object({
    ruleName: z.string(),
    severity: z.string().optional(),
    from: z.string(),
    to: z.string().optional().default(''),
});

export const ArchitectureBaselineSchema = z.object({
    version: z.string().optional().default('1.0.0'),
    generatedAt: z.string().optional(),
    violations: z.array(BaselineViolationSchema),
});

export type BaselineViolation = z.infer<typeof BaselineViolationSchema>;
export type ArchitectureBaseline = z.infer<typeof ArchitectureBaselineSchema>;

export interface ViolationInput {
    from: string;
    to?: string;
    rule: {
        name: string;
        severity?: string;
    };
}

export interface ArchitectureDebtAnalysis {
    baselineCount: number;
    existingDebtCount: number;
    newViolationCount: number;
    resolvedCount: number;
    violations: {
        ruleName: string;
        severity: string;
        from: string;
        to: string;
        status: 'existing' | 'new' | 'resolved';
    }[];
}

export function getViolationFingerprint(v: { ruleName: string; from: string; to?: string }): string {
    return `${v.ruleName}::${v.from}::${v.to || ''}`;
}

export async function readBaselineFile(baselinePath: string, cwd: string = process.cwd()): Promise<ArchitectureBaseline> {
    const absPath = path.resolve(cwd, baselinePath);
    if (!existsSync(absPath)) {
        throw new ValidationError(`Baseline file not found at ${baselinePath}`);
    }

    try {
        const raw = await fs.readFile(absPath, 'utf8');
        const parsed: unknown = JSON.parse(raw);

        // Support array of violations or object with violations array or raw depcruise format
        let rawViolations: Record<string, unknown>[] = [];
        if (Array.isArray(parsed)) {
            const list = parsed as unknown as Record<string, unknown>[];
            rawViolations = list.map(item => ({
                ruleName: typeof item.ruleName === 'string' ? item.ruleName : (typeof (item.rule as Record<string, unknown>)?.name === 'string' ? (item.rule as Record<string, unknown>).name as string : 'unknown'),
                severity: typeof item.severity === 'string' ? item.severity : (typeof (item.rule as Record<string, unknown>)?.severity === 'string' ? (item.rule as Record<string, unknown>).severity as string : 'warn'),
                from: typeof item.from === 'string' ? item.from : '',
                to: typeof item.to === 'string' ? item.to : ''
            }));
        } else if (parsed && typeof parsed === 'object' && parsed !== null && 'violations' in parsed && Array.isArray((parsed as Record<string, unknown>).violations)) {
            const list = (parsed as Record<string, unknown>).violations as Record<string, unknown>[];
            rawViolations = list.map(item => ({
                ruleName: typeof item.ruleName === 'string' ? item.ruleName : (typeof (item.rule as Record<string, unknown>)?.name === 'string' ? (item.rule as Record<string, unknown>).name as string : 'unknown'),
                severity: typeof item.severity === 'string' ? item.severity : (typeof (item.rule as Record<string, unknown>)?.severity === 'string' ? (item.rule as Record<string, unknown>).severity as string : 'warn'),
                from: typeof item.from === 'string' ? item.from : '',
                to: typeof item.to === 'string' ? item.to : ''
            }));
        } else if (parsed && typeof parsed === 'object' && parsed !== null && 'summary' in parsed) {
            const list = ((parsed as Record<string, unknown>).summary as { violations?: Record<string, unknown>[] })?.violations || [];
            rawViolations = list.map(item => ({
                ruleName: typeof item.ruleName === 'string' ? item.ruleName : (typeof (item.rule as Record<string, unknown>)?.name === 'string' ? (item.rule as Record<string, unknown>).name as string : 'unknown'),
                severity: typeof item.severity === 'string' ? item.severity : (typeof (item.rule as Record<string, unknown>)?.severity === 'string' ? (item.rule as Record<string, unknown>).severity as string : 'warn'),
                from: typeof item.from === 'string' ? item.from : '',
                to: typeof item.to === 'string' ? item.to : ''
            }));
        } else if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).summary) {
            const summaryObj = (parsed as Record<string, unknown>).summary as Record<string, unknown>;
            if (Array.isArray(summaryObj.violations)) {
                const list = summaryObj.violations as Record<string, unknown>[];
                rawViolations = list.map(item => ({
                    ruleName: typeof (item.rule as Record<string, unknown>)?.name === 'string' ? (item.rule as Record<string, unknown>).name as string : 'unknown',
                    severity: typeof (item.rule as Record<string, unknown>)?.severity === 'string' ? (item.rule as Record<string, unknown>).severity as string : 'warn',
                    from: typeof item.from === 'string' ? item.from : '',
                    to: typeof item.to === 'string' ? item.to : ''
                }));
            }
        }

        const validation = ArchitectureBaselineSchema.safeParse({ violations: rawViolations || [] });
        if (!validation.success) {
            throw new ValidationError(`Invalid baseline format in ${baselinePath}: ${validation.error.message}`);
        }
        return validation.data;
    } catch (err: unknown) {
        if (err instanceof ValidationError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new ValidationError(`Failed to parse baseline file at ${baselinePath}: ${message}`);
    }
}

export async function writeBaselineFile(
    baselinePath: string,
    currentViolations: ViolationInput[],
    cwd: string = process.cwd()
): Promise<void> {
    const absPath = path.resolve(cwd, baselinePath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });

    const baselineData: ArchitectureBaseline = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        violations: currentViolations.map(v => ({
            ruleName: v.rule.name,
            severity: v.rule.severity || 'warn',
            from: v.from,
            to: v.to || ''
        }))
    };

    await fs.writeFile(absPath, JSON.stringify(baselineData, null, 2));
}

export function evaluateArchitectureDebt(
    currentViolations: ViolationInput[],
    baseline?: ArchitectureBaseline
): ArchitectureDebtAnalysis {
    if (!baseline) {
        return {
            baselineCount: 0,
            existingDebtCount: 0,
            newViolationCount: currentViolations.length,
            resolvedCount: 0,
            violations: currentViolations.map(v => ({
                ruleName: v.rule.name,
                severity: v.rule.severity || 'warn',
                from: v.from,
                to: v.to || '',
                status: 'new'
            }))
        };
    }

    const baselineMap = new Map<string, BaselineViolation>();
    for (const bv of baseline.violations) {
        const fp = getViolationFingerprint(bv);
        baselineMap.set(fp, bv);
    }

    const matchedBaselineFps = new Set<string>();
    const evaluatedViolations: ArchitectureDebtAnalysis['violations'] = [];

    let existingDebtCount = 0;
    let newViolationCount = 0;

    for (const cur of currentViolations) {
        const fp = getViolationFingerprint({
            ruleName: cur.rule.name,
            from: cur.from,
            to: cur.to
        });

        if (baselineMap.has(fp)) {
            matchedBaselineFps.add(fp);
            existingDebtCount++;
            evaluatedViolations.push({
                ruleName: cur.rule.name,
                severity: cur.rule.severity || 'warn',
                from: cur.from,
                to: cur.to || '',
                status: 'existing'
            });
        } else {
            newViolationCount++;
            evaluatedViolations.push({
                ruleName: cur.rule.name,
                severity: cur.rule.severity || 'warn',
                from: cur.from,
                to: cur.to || '',
                status: 'new'
            });
        }
    }

    let resolvedCount = 0;
    for (const [fp, bv] of baselineMap.entries()) {
        if (!matchedBaselineFps.has(fp)) {
            resolvedCount++;
            evaluatedViolations.push({
                ruleName: bv.ruleName,
                severity: bv.severity || 'warn',
                from: bv.from,
                to: bv.to || '',
                status: 'resolved'
            });
        }
    }

    return {
        baselineCount: baseline.violations.length,
        existingDebtCount,
        newViolationCount,
        resolvedCount,
        violations: evaluatedViolations
    };
}
