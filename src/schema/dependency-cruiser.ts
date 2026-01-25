import { z } from 'zod';

/**
 * Schema for a single dependency relation.
 * Represents a 'to' edge in the dependency graph.
 */
export const DependencySchema = z.object({
  /** The import string used in the code (e.g., "./utils") */
  module: z.string(),
  /** The absolute or relative path to the resolved file (e.g., "src/utils.ts") */
  resolved: z.string(),
  /** Whether the dependency is a core node module (e.g., "fs", "path") */
  coreModule: z.boolean(),
  /** Whether the dependency is followable by dependency-cruiser */
  followable: z.boolean(),
  /** Whether the dependency could not be resolved */
  couldNotResolve: z.boolean(),
  /** Whether the dependency is circular */
  circular: z.boolean().optional(),
  /** Whether the dependency is dynamic (e.g., import()) */
  dynamic: z.boolean().optional(),
  /** Types of dependency (e.g., "local", "npm", "import") */
  dependencyTypes: z.array(z.string()).optional(),
  /** The module system used (e.g., "es6", "cjs") */
  moduleSystem: z.string().optional(),
  /** Validity of the dependency */
  valid: z.boolean().optional(),
  /** Cycle path if circular */
  cycle: z.array(z.object({
    name: z.string(),
    dependencyTypes: z.array(z.string())
  })).optional(),
});

export type IDependency = z.infer<typeof DependencySchema>;

/**
 * Schema for a module (file) in the graph.
 * Represents a node in the dependency graph.
 */
export const ModuleSchema = z.object({
  /** The path to the source file (acts as the unique ID) */
  source: z.string(),
  /** List of outgoing dependencies */
  dependencies: z.array(DependencySchema),
  /** List of files that depend on this module (incoming edges) */
  dependents: z.array(z.string()).optional(),
  /** Whether the module is an orphan (no incoming or outgoing dependencies within scope) */
  orphan: z.boolean().optional(),
  /** Whether the module is valid according to rules */
  valid: z.boolean().optional(),
});

export type IModule = z.infer<typeof ModuleSchema>;

/**
 * Schema for a violation found by dependency-cruiser.
 */
export const ViolationSchema = z.object({
    type: z.string(),
    from: z.string(),
    to: z.string(),
    rule: z.object({
        name: z.string(),
        severity: z.string(),
    }).passthrough().optional(),
}).passthrough();

/**
 * Schema for the top-level dependency-cruiser output.
 */
export const CruiseResultSchema = z.object({
  /** List of all modules scanned */
  modules: z.array(ModuleSchema),
  /** Summary of the scan (violations, errors, etc.) */
  summary: z.object({
    violations: z.array(ViolationSchema),
    error: z.number(),
    warn: z.number(),
    info: z.number(),
    totalCruised: z.number(),
    totalDependenciesCruised: z.number(),
    optionsUsed: z.any().optional(),
  }).optional(),
});

export type ICruiseResult = z.infer<typeof CruiseResultSchema>;
