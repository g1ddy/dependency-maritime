import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  calculateNamespaceMetrics
} from '../src/cli/analyze/calculate-metrics';
import type { DependencyCruiserModule } from '../src/cli/analyze/models';
import nativeMetrics from './fixtures/dependency-cruiser-18/native-metrics.json';

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
  const fixtureModules = nativeMetrics.modules as DependencyCruiserModule[];

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

    expect(nativeMetrics.generatedBy).toMatchObject({
      name: 'dependency-cruiser',
      version: '18.2.0'
    });

    for (const nativeModule of nativeMetrics.modules) {
      const maritimeModule = result.files.find(file => file.file === nativeModule.source);

      expect(maritimeModule, nativeModule.source).toBeDefined();
      expect(maritimeModule!.fanOut).toBe(nativeModule.dependencies.length);
      expect(maritimeModule!.fanIn).toBe(nativeModule.dependents.length);
      expect(maritimeModule!.instability).toBe(nativeModule.instability);
    }
  });

  it('calculates namespace-level coupling across boundaries without counting intra-namespace edges', () => {
    const namespaceMetrics = calculateNamespaceMetrics(fixtureModules);

    for (const nativeFolder of nativeMetrics.folders) {
      const maritimeNamespace = namespaceMetrics.find(namespace => namespace.folder === nativeFolder.name);

      expect(maritimeNamespace, nativeFolder.name).toBeDefined();
      expect(maritimeNamespace!.efferentCoupling).toBe(nativeFolder.efferentCouplings);
      expect(maritimeNamespace!.afferentCoupling).toBe(nativeFolder.afferentCouplings);
      expect(maritimeNamespace!.instability).toBe(nativeFolder.instability);
    }
  });
});
