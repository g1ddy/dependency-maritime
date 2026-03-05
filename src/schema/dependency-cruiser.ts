import { z } from 'zod';
import type { ICruiseResult, IModule, IDependency } from 'dependency-cruiser';

/**
 * Re-export official types as the source of truth for the application.
 */
export type { ICruiseResult, IModule, IDependency };

/**
 * Schema for a single dependency relation.
 * Represents a 'to' edge in the dependency graph.
 */
export const DependencySchema = z.object({
  /** 'true' if following this dependency will ultimately return to the source */
  circular: z.boolean(),
  /** Whether or not this is a node.js core module */
  coreModule: z.boolean(),
  /** 'true' if dependency-cruiser could not resolve the module name to a file */
  couldNotResolve: z.boolean(),
  /** The type of inclusion - local, core, npm, etc. */
  dependencyTypes: z.array(z.string()),
  /** true if this dependency is dynamic, false in all other cases */
  dynamic: z.boolean(),
  /** true if the dependency was defined by a require not named 'require' */
  exoticallyRequired: z.boolean(),
  /** Whether or not this is a dependency that can be followed any further */
  followable: z.boolean(),
  /** the instability of the dependency */
  instability: z.number(),
  /** If the module specification is an URI with a protocol, this holds it */
  protocol: z.enum(['data:', 'file:', 'node:']),
  /** If the module specification is an URI and contains a mime type, this holds it */
  mimeType: z.string(),
  /** The module system used (e.g., "es6", "cjs") */
  moduleSystem: z.enum(['amd', 'cjs', 'es6', 'tsd']),
  /** The import string used in the code (e.g., "./utils") */
  module: z.string(),
  /** The absolute or relative path to the resolved file (e.g., "src/utils.ts") */
  resolved: z.string(),
  /** 'true' if this dependency violated a rule */
  valid: z.boolean(),
  /** Whether the dependency exists only before compilation (e.g. type-only) */
  preCompilationOnly: z.boolean().optional(),
  /** 'true' when the module included the module explicitly as type only */
  typeOnly: z.boolean().optional(),
  /** Cycle path if circular */
  cycle: z.array(z.object({
    name: z.string(),
    dependencyTypes: z.array(z.string())
  })).optional(),
}).passthrough();

/**
 * Schema for a module (file) in the graph.
 * Represents a node in the dependency graph.
 */
export const ModuleSchema = z.object({
  /** The path to the source file (acts as the unique ID) */
  source: z.string(),
  /** 'true' if this module violated a rule */
  valid: z.boolean(),
  /** List of outgoing dependencies */
  dependencies: z.array(DependencySchema),
  /** List of files that depend on this module (incoming edges) */
  dependents: z.array(z.string()),
  /** Whether or not this is a node.js core module */
  coreModule: z.boolean().optional(),
  /** 'true' if dependency-cruiser could not resolve the module name to a file */
  couldNotResolve: z.boolean().optional(),
  /** Whether the module is an orphan */
  orphan: z.boolean().optional(),
}).passthrough();

/**
 * Schema for a violation found by dependency-cruiser.
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

/**
 * Schema for the top-level dependency-cruiser output.
 */
export const CruiseResultSchema = z.object({
  /** List of all modules scanned */
  modules: z.array(ModuleSchema),
  /** Summary of the scan (violations, errors, etc.) */
  summary: z.object({
    error: z.number(),
    ignore: z.number(),
    info: z.number(),
    totalCruised: z.number(),
    totalDependenciesCruised: z.number().optional(),
    violations: z.array(ViolationSchema),
    warn: z.number(),
    optionsUsed: z.any(),
  }).passthrough(),
}).passthrough();
