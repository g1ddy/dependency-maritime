import { z } from 'zod';

export const MANIFEST_SCHEMA_VERSION = '1.0.0';

export const ArtifactManifestArtifactsSchema = z.object({
  graph: z.string().min(1),
  metrics: z.string().min(1),
  report: z.string().min(1),
});

export const ArtifactManifestSummarySchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  healthScore: z.number(),
  scannedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
});

export const ArtifactManifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  toolVersion: z.string().min(1),
  generatedAt: z.string(),
  sourceRoots: z.array(z.string()).min(1),
  artifacts: ArtifactManifestArtifactsSchema,
  summary: ArtifactManifestSummarySchema,
});

export type ArtifactManifestArtifacts = z.infer<typeof ArtifactManifestArtifactsSchema>;
export type ArtifactManifestSummary = z.infer<typeof ArtifactManifestSummarySchema>;
export type ArtifactManifest = z.infer<typeof ArtifactManifestSchema>;
