import { describe, it, expect } from 'vitest';
import { ArtifactManifestSchema, MANIFEST_SCHEMA_VERSION } from './manifest';

describe('ArtifactManifestSchema', () => {
  it('validates a correct manifest object', () => {
    const validManifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      toolVersion: '0.0.0',
      generatedAt: '2025-01-01T00:00:00.000Z',
      sourceRoots: ['src'],
      artifacts: {
        graph: 'dependency-graph.json',
        metrics: 'complexity-metrics.json',
        report: 'complexity-report.md',
      },
      summary: {
        totalFiles: 10,
        healthScore: 95.5,
        scannedCount: 10,
        skippedCount: 0,
      },
    };

    const result = ArtifactManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('rejects an unsupported schema version', () => {
    const invalidManifest = {
      schemaVersion: '2.0.0',
      toolVersion: '0.0.0',
      generatedAt: '2025-01-01T00:00:00.000Z',
      sourceRoots: ['src'],
      artifacts: {
        graph: 'dependency-graph.json',
        metrics: 'complexity-metrics.json',
        report: 'complexity-report.md',
      },
      summary: {
        totalFiles: 10,
        healthScore: 95.5,
        scannedCount: 10,
        skippedCount: 0,
      },
    };

    const result = ArtifactManifestSchema.safeParse(invalidManifest);
    expect(result.success).toBe(false);
  });
});
