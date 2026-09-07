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

  it('strips unknown upstream fields at top-level, module, dependency, violation, and rule levels', () => {
    const normalized = normalizeMaritimeGraph({
      environment: { platform: 'machine-specific' },
      modules: [{
        source: 'src/a.ts',
        valid: false,
        dependencies: [{
          circular: false,
          coreModule: false,
          couldNotResolve: false,
          dependencyTypes: ['local', 'import'],
          dynamic: false,
          exoticallyRequired: false,
          followable: true,
          moduleSystem: 'es6',
          module: './b',
          resolved: 'src/b.ts',
          valid: false,
          upstreamOnly: 'discard me'
        }],
        dependents: [],
        orphan: false,
        upstreamModuleField: true
      }],
      summary: {
        error: 1,
        ignore: 0,
        info: 0,
        totalCruised: 1,
        totalDependenciesCruised: 1,
        warn: 0,
        optionsUsed: {},
        environment: { node: '22' },
        violations: [{
          type: 'dependency',
          from: 'src/a.ts',
          to: 'src/b.ts',
          upstreamViolationField: true,
          rule: {
            name: 'feature-isolation',
            severity: 'error',
            comment: 'upstream-only policy prose'
          }
        }]
      }
    });

    expect(normalized).not.toHaveProperty('environment');
    expect(normalized.modules[0]).not.toHaveProperty('upstreamModuleField');
    expect(normalized.modules[0].dependencies[0]).not.toHaveProperty('upstreamOnly');
    expect(normalized.summary).not.toHaveProperty('environment');
    expect(normalized.summary.violations[0]).not.toHaveProperty('upstreamViolationField');
    expect(normalized.summary.violations[0].rule).toEqual({
      name: 'feature-isolation',
      severity: 'error'
    });
  });
});
