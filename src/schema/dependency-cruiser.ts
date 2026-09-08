import { z } from 'zod';
import type { ICruiseResult, IModule, IDependency } from 'dependency-cruiser';

/**
 * Re-export official types for integrations that need to describe raw Dependency-Cruiser data.
 * Maritime's persisted graph is validated and normalized before it becomes canonical evidence.
 */
export type { ICruiseResult, IModule, IDependency };

const CycleEntrySchema = z.object({
  name: z.string(),
  dependencyTypes: z.array(z.string())
}).passthrough();

/**
 * Validation schema for a dependency relation. Upstream dependency fields are intentionally
 * preserved because they are deterministic graph semantics used by existing Maritime consumers.
 */
export const DependencySchema = z.object({
  circular: z.boolean(),
  coreModule: z.boolean(),
  couldNotResolve: z.boolean(),
  dependencyTypes: z.array(z.string()),
  dynamic: z.boolean(),
  exoticallyRequired: z.boolean(),
  followable: z.boolean(),
  instability: z.number().optional(),
  protocol: z.enum(['data:', 'file:', 'node:']).optional(),
  mimeType: z.string().optional(),
  moduleSystem: z.enum(['amd', 'cjs', 'es6', 'tsd']),
  module: z.string(),
  resolved: z.string(),
  valid: z.boolean(),
  preCompilationOnly: z.boolean().optional(),
  typeOnly: z.boolean().optional(),
  cycle: z.array(CycleEntrySchema).optional(),
}).passthrough();

/** Validation schema for a dependency-cruiser module. */
export const ModuleSchema = z.object({
  source: z.string(),
  valid: z.boolean(),
  dependencies: z.array(DependencySchema),
  dependents: z.array(z.string()),
  coreModule: z.boolean().optional(),
  couldNotResolve: z.boolean().optional(),
  orphan: z.boolean().optional(),
}).passthrough();

/**
 * Validation schema for an upstream architecture violation.
 * Supports Dependency-Cruiser 18 instability/stable-dependency violations (`type: 'instability'`).
 * Maritime exposes upstream `moreUnstable` violations when configured in consumer policy,
 * while deterministically calculating module/namespace instability ($I = C_e / (C_a + C_e)$)
 * from canonical graph evidence without forcing or silently injecting policy rules.
 */
export const ViolationSchema = z.object({
  type: z.enum(['dependency', 'module', 'cycle', 'reachability', 'instability']).optional(),
  from: z.string(),
  to: z.string(),
  rule: z.object({
    name: z.string(),
    severity: z.enum(['error', 'warn', 'info', 'ignore']),
  }).passthrough(),
}).passthrough();

/** Validation schema for raw dependency-cruiser output. */
export const CruiseResultSchema = z.object({
  modules: z.array(ModuleSchema),
  summary: z.object({
    error: z.number(),
    ignore: z.number(),
    info: z.number(),
    totalCruised: z.number(),
    totalDependenciesCruised: z.number().optional(),
    violations: z.array(ViolationSchema),
    warn: z.number(),
    optionsUsed: z.unknown(),
  }).passthrough(),
}).passthrough();

export type MaritimeDependency = z.infer<typeof DependencySchema>;
export type MaritimeModule = z.infer<typeof ModuleSchema>;
export type MaritimeViolation = z.infer<typeof ViolationSchema>;

export interface MaritimeCruiseResult {
  modules: MaritimeModule[];
  summary: z.infer<typeof CruiseResultSchema>['summary'];
}

/**
 * Normalizes raw dependency-cruiser output to Maritime's canonical graph envelope.
 *
 * Dependency-Cruiser 18 adds top-level runtime/environment metadata that can vary by machine.
 * Maritime deliberately omits those top-level additions while preserving validated module,
 * dependency, violation, and summary fields so existing deterministic graph semantics are not lost.
 */
export function normalizeMaritimeGraph(raw: unknown): MaritimeCruiseResult {
  const validated = CruiseResultSchema.parse(raw);
  return {
    modules: validated.modules,
    summary: validated.summary
  };
}
