import { describe, it, expect } from 'vitest';
import {
    evaluateArchitectureDebt,
    getViolationFingerprint,
    type ArchitectureBaseline,
    type ViolationInput
} from './architecture-debt';

describe('architecture-debt', () => {
    it('fingerprints violations deterministically', () => {
        const fp = getViolationFingerprint({ ruleName: 'no-deps', from: 'src/a.ts', to: 'src/b.ts' });
        expect(fp).toBe('no-deps::src/a.ts::src/b.ts');
    });

    it('treats all violations as new when no baseline is provided', () => {
        const violations: ViolationInput[] = [
            { from: 'src/a.ts', to: 'src/b.ts', rule: { name: 'feature-isolation', severity: 'error' } }
        ];

        const res = evaluateArchitectureDebt(violations);
        expect(res.baselineCount).toBe(0);
        expect(res.newViolationCount).toBe(1);
        expect(res.existingDebtCount).toBe(0);
        expect(res.resolvedCount).toBe(0);
        expect(res.violations[0].status).toBe('new');
    });

    it('correctly categorizes existing, new, and resolved violations against baseline', () => {
        const baseline: ArchitectureBaseline = {
            version: '1.0.0',
            violations: [
                { ruleName: 'rule1', from: 'src/a.ts', to: 'src/b.ts', severity: 'warn' },
                { ruleName: 'rule2', from: 'src/c.ts', to: 'src/d.ts', severity: 'error' }
            ]
        };

        const current: ViolationInput[] = [
            // Matches baseline rule1 -> existing
            { from: 'src/a.ts', to: 'src/b.ts', rule: { name: 'rule1', severity: 'warn' } },
            // Brand new violation -> new
            { from: 'src/x.ts', to: 'src/y.ts', rule: { name: 'rule3', severity: 'error' } }
        ];

        const res = evaluateArchitectureDebt(current, baseline);
        expect(res.baselineCount).toBe(2);
        expect(res.existingDebtCount).toBe(1);
        expect(res.newViolationCount).toBe(1);
        expect(res.resolvedCount).toBe(1); // rule2 is resolved

        const existing = res.violations.find(v => v.ruleName === 'rule1');
        expect(existing?.status).toBe('existing');

        const newV = res.violations.find(v => v.ruleName === 'rule3');
        expect(newV?.status).toBe('new');

        const resolved = res.violations.find(v => v.ruleName === 'rule2');
        expect(resolved?.status).toBe('resolved');
    });
});
