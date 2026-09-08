import { describe, it, expect, assert } from 'vitest';
import { CruiseResultSchema, normalizeMaritimeGraph } from './dependency-cruiser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dependency Cruiser Schema', () => {
  it('should validate the sample data', () => {
    const sampleDataPath = path.resolve(__dirname, '../../sample-data/dependency-graph.json');

    if (!fs.existsSync(sampleDataPath)) {
      throw new Error(`Sample data not found at: ${sampleDataPath}`);
    }

    const fileContent = fs.readFileSync(sampleDataPath, 'utf-8');
    const json: unknown = JSON.parse(fileContent);

    const result = CruiseResultSchema.safeParse(json);

    if (!result.success) {
      assert.fail(`Schema Validation Error: ${JSON.stringify(result.error.format(), null, 2)}`);
    }

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.modules.length).toBeGreaterThan(0);
      const appModule = result.data.modules.find(m => m.source === 'src/App.tsx');
      expect(appModule).toBeDefined();
      expect(appModule?.dependencies.length).toBeGreaterThan(0);
    }
  });

  it('removes machine-specific top-level metadata while preserving deterministic dependency fields', () => {
    const normalized = normalizeMaritimeGraph({
      modules: [{
        source: 'src/a.ts',
        valid: true,
        dependents: [],
        dependencies: [{
          circular: false,
          coreModule: false,
          couldNotResolve: false,
          dependencyTypes: ['local'],
          dynamic: false,
          exoticallyRequired: false,
          followable: true,
          moduleSystem: 'es6',
          module: './b',
          resolved: 'src/b.ts',
          valid: true,
          matchesDoNotFollow: false
        }]
      }],
      summary: {
        error: 0,
        ignore: 0,
        info: 0,
        totalCruised: 1,
        violations: [],
        warn: 0,
        optionsUsed: {},
        deterministicSummaryField: 'kept'
      },
      environment: {
        nodeVersion: 'v22.13.0',
        platform: 'linux'
      }
    });

    expect(normalized).not.toHaveProperty('environment');
    expect(normalized.modules[0].dependencies[0]).toMatchObject({ matchesDoNotFollow: false });
    expect(normalized.summary).toMatchObject({ deterministicSummaryField: 'kept' });
  });

  it('validates instability and stable-dependency violations in summary.violations', () => {
    const normalized = normalizeMaritimeGraph({
      modules: [{
        source: 'src/a.ts',
        valid: false,
        dependents: [],
        dependencies: [{
          circular: false,
          coreModule: false,
          couldNotResolve: false,
          dependencyTypes: ['local'],
          dynamic: false,
          exoticallyRequired: false,
          followable: true,
          instability: 0.8,
          moduleSystem: 'es6',
          module: './b',
          resolved: 'src/b.ts',
          valid: false
        }]
      }],
      summary: {
        error: 1,
        ignore: 0,
        info: 0,
        totalCruised: 1,
        violations: [{
          type: 'instability',
          from: 'src/a.ts',
          to: 'src/b.ts',
          rule: {
            name: 'no-unstable-dependencies',
            severity: 'error'
          }
        }],
        warn: 0,
        optionsUsed: {}
      }
    });

    expect(normalized.summary.violations[0]).toEqual({
      type: 'instability',
      from: 'src/a.ts',
      to: 'src/b.ts',
      rule: {
        name: 'no-unstable-dependencies',
        severity: 'error'
      }
    });
    expect(normalized.modules[0].dependencies[0].instability).toBe(0.8);
  });
});
