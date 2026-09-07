import { z } from 'zod';
import type { ICruiseResult, IModule, IDependency } from 'dependency-cruiser';

/**
 * Re-export official types for integrations that need to describe raw Dependency-Cruiser data.
 * Maritime's public artifact contract uses the normalized types below instead.
 */
export type { ICruiseResult, IModule, IDependency };

const CycleEntrySchema = z.object({
  name: z.string(),
  dependencyTypes: z.array(z.string())
});

/**
 * Validation schema for a raw dependency relation. It accepts upstream additions, but the
 * normalizer below explicitly selects the fields Maritime owns in canonical evidence.
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

/** Validation schema for a raw dependency-cruiser module. */
export const ModuleSchema = z.object({
  source: z.string(),
  valid: z.boolean(),
  dependencies: z.array(DependencySchema),
  dependents: z.array(z.string()),
  coreModule: z.boolean().optional(),
  couldNotResolve: z.boolean().optional(),
  orphan: z.boolean().optional(),
}).passthrough();

/** Validation schema for an upstream architecture violation. */
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

/** Canonical graph shapes Maritime persists after validation and normalization. */
export interface MaritimeDependency {
  circular: boolean;
  coreModule: boolean;
  couldNotResolve: boolean;
  dependencyTypes: string[];
  dynamic: boolean;
  exoticallyRequired: boolean;
  followable: boolean;
  instability?: number;
  protocol?: 'data:' | 'file:' | 'node:';
  mimeType?: string;
  moduleSystem: 'amd' | 'cjs' | 'es6' | 'tsd';
  module: string;
  resolved: string;
  valid: boolean;
  preCompilationOnly?: boolean;
  typeOnly?: boolean;
  cycle?: { name: string; dependencyTypes: string[] }[];
}

export interface MaritimeModule {
  source: string;
  valid: boolean;
  dependencies: MaritimeDependency[];
  dependents: string[];
  coreModule?: boolean;
  couldNotResolve?: boolean;
  orphan?: boolean;
}

export interface MaritimeViolation {
  type?: 'dependency' | 'module' | 'cycle' | 'reachability' | 'instability';
  from: string;
  to: string;
  rule: {
    name: string;
    severity: 'error' | 'warn' | 'info' | 'ignore';
  };
}

export interface MaritimeCruiseResult {
  modules: MaritimeModule[];
  summary: {
    error: number;
    ignore: number;
    info: number;
    totalCruised: number;
    totalDependenciesCruised?: number;
    violations: MaritimeViolation[];
    warn: number;
    optionsUsed: unknown;
  };
}

function normalizeDependency(dependency: z.infer<typeof DependencySchema>): MaritimeDependency {
  return {
    circular: dependency.circular,
    coreModule: dependency.coreModule,
    couldNotResolve: dependency.couldNotResolve,
    dependencyTypes: [...dependency.dependencyTypes],
    dynamic: dependency.dynamic,
    exoticallyRequired: dependency.exoticallyRequired,
    followable: dependency.followable,
    ...(dependency.instability !== undefined ? { instability: dependency.instability } : {}),
    ...(dependency.protocol !== undefined ? { protocol: dependency.protocol } : {}),
    ...(dependency.mimeType !== undefined ? { mimeType: dependency.mimeType } : {}),
    moduleSystem: dependency.moduleSystem,
    module: dependency.module,
    resolved: dependency.resolved,
    valid: dependency.valid,
    ...(dependency.preCompilationOnly !== undefined ? { preCompilationOnly: dependency.preCompilationOnly } : {}),
    ...(dependency.typeOnly !== undefined ? { typeOnly: dependency.typeOnly } : {}),
    ...(dependency.cycle !== undefined ? {
      cycle: dependency.cycle.map(entry => ({
        name: entry.name,
        dependencyTypes: [...entry.dependencyTypes]
      }))
    } : {})
  };
}

/**
 * Normalizes raw dependency-cruiser output to Maritime's canonical graph shape. Unknown upstream
 * fields are deliberately discarded at every persisted level so machine/environment details cannot
 * silently become part of Maritime's public artifact contract.
 */
export function normalizeMaritimeGraph(raw: unknown): MaritimeCruiseResult {
  const validated = CruiseResultSchema.parse(raw);
  return {
    modules: validated.modules.map(module => ({
      source: module.source,
      valid: module.valid,
      dependencies: module.dependencies.map(normalizeDependency),
      dependents: [...module.dependents],
      ...(module.coreModule !== undefined ? { coreModule: module.coreModule } : {}),
      ...(module.couldNotResolve !== undefined ? { couldNotResolve: module.couldNotResolve } : {}),
      ...(module.orphan !== undefined ? { orphan: module.orphan } : {})
    })),
    summary: {
      error: validated.summary.error,
      ignore: validated.summary.ignore,
      info: validated.summary.info,
      totalCruised: validated.summary.totalCruised,
      ...(validated.summary.totalDependenciesCruised !== undefined
        ? { totalDependenciesCruised: validated.summary.totalDependenciesCruised }
        : {}),
      violations: validated.summary.violations.map(violation => ({
        ...(violation.type !== undefined ? { type: violation.type } : {}),
        from: violation.from,
        to: violation.to,
        rule: {
          name: violation.rule.name,
          severity: violation.rule.severity
        }
      })),
      warn: validated.summary.warn,
      optionsUsed: validated.summary.optionsUsed
    }
  };
}
