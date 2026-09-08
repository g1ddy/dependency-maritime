import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  calculateNamespaceMetrics,
  calculateInstability
} from '../src/cli/analyze/calculate-metrics';
import type { DependencyCruiserModule } from '../src/cli/analyze/models';

/**
 * Native Metric Parity Suite & Documentation
 *
 * Semantic Comparison between Maritime Metrics and Dependency-Cruiser 18:
 *
 * 1. Fan-Out (Efferent Coupling, C_e):
 *    - Dependency-Cruiser signal: `module.dependencies.length`
 *    - Maritime module metric: `f.fanOut = module.dependencies.length`
 *    - Parity: Identical for module level.
 *    - Scope difference at Namespace level: Maritime namespace efferent coupling ($C_e$) counts unique external
 *      modules target-referenced outside the namespace, excluding intra-namespace internal dependencies and `node_modules`.
 *
 * 2. Fan-In (Afferent Coupling, C_a):
 *    - Dependency-Cruiser signal: `module.dependents.length`
 *    - Maritime module metric: `f.fanIn = module.dependents.length`
 *    - Parity: Identical for module level.
 *    - Scope difference at Namespace level: Maritime namespace afferent coupling ($C_a$) counts unique external
 *      modules referencing into the namespace from outside.
 *
 * 3. Instability (I):
 *    - Mathematical definition: I = C_e / (C_a + C_e) where range is [0, 1].
 *    - Parity: Maritime computes I = fanOut / (fanIn + fanOut) for modules and C_e / (C_a + C_e) for namespaces,
 *      defaulting to 0 when C_a + C_e = 0.
 */

describe('Dependency-Cruiser Native Metric Parity', () => {
  const fixtureModules: DependencyCruiserModule[] = [
    {
      source: 'src/features/auth/login.ts',
      valid: true,
      dependencies: [
        {
          module: './utils',
          resolved: 'src/features/auth/utils.ts',
          moduleSystem: 'es6',
          dependencyTypes: ['local'],
          valid: true,
          followable: true,
          couldNotResolve: false,
          coreModule: false,
          exoticallyRequired: false,
          circular: false,
          dynamic: false
        },
        {
          module: '../../shared/http.ts',
          resolved: 'src/shared/http.ts',
          moduleSystem: 'es6',
          dependencyTypes: ['local'],
          valid: true,
          followable: true,
          couldNotResolve: false,
          coreModule: false,
          exoticallyRequired: false,
          circular: false,
          dynamic: false
        }
      ],
      dependents: []
    },
    {
      source: 'src/features/auth/utils.ts',
      valid: true,
      dependencies: [],
      dependents: ['src/features/auth/login.ts']
    },
    {
      source: 'src/shared/http.ts',
      valid: true,
      dependencies: [],
      dependents: ['src/features/auth/login.ts']
    }
  ];

  it('matches module-level fan-in and fan-out exactly against Dependency-Cruiser signals', () => {
    const locMap = {
      'src/features/auth/login.ts': 50,
      'src/features/auth/utils.ts': 20,
      'src/shared/http.ts': 30
    };
    const complexityMap = {
      'src/features/auth/login.ts': { complexity: 2, scanned: true },
      'src/features/auth/utils.ts': { complexity: 1, scanned: true },
      'src/shared/http.ts': { complexity: 1, scanned: true }
    };
    const thresholds = { loc: 300, complexity: 10, fanOut: 15 };

    const result = calculateMetrics(fixtureModules, locMap, complexityMap, thresholds, 'src');

    const login = result.files.find(f => f.file === 'src/features/auth/login.ts')!;
    const authModule = fixtureModules.find(m => m.source === 'src/features/auth/login.ts')!;

    // Fan-out parity
    expect(login.fanOut).toBe(authModule.dependencies.length);
    expect(login.fanOut).toBe(2);

    // Fan-in parity
    expect(login.fanIn).toBe(authModule.dependents.length);
    expect(login.fanIn).toBe(0);

    // Instability parity
    const expectedInstability = calculateInstability(login.fanIn, login.fanOut);
    expect(login.instability).toBe(expectedInstability);
    expect(login.instability).toBe(1.0); // 2 / (0 + 2) = 1.0
  });

  it('calculates namespace-level coupling across boundaries without counting intra-namespace edges', () => {
    const namespaceMetrics = calculateNamespaceMetrics(fixtureModules);

    const authNs = namespaceMetrics.find(n => n.folder === 'src/features/auth')!;
    const sharedNs = namespaceMetrics.find(n => n.folder === 'src/shared')!;

    // src/features/auth has 1 external dependency (src/shared/http.ts), ignore intra-auth login -> utils
    expect(authNs.efferentCoupling).toBe(1);
    expect(authNs.afferentCoupling).toBe(0);
    expect(authNs.instability).toBe(1.0);

    // src/shared has 1 external dependent (src/features/auth/login.ts)
    expect(sharedNs.efferentCoupling).toBe(0);
    expect(sharedNs.afferentCoupling).toBe(1);
    expect(sharedNs.instability).toBe(0.0);
  });
});
