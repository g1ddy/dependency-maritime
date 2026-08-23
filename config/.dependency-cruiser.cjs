/**
 * Dependency Maritime's repository architecture policy.
 *
 * This configuration is intentionally specific to this repository. The distributed
 * CLI must not assume that consumers use these source roots, boundaries, or this
 * tsconfig. Graph generation should prefer a consumer-supplied dependency-cruiser
 * configuration and otherwise use documented portable defaults.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'feature-isolation',
      severity: 'error',
      comment: 'Features should be isolated and not import from other features.',
      from: {
        path: '^src/features/([^/]+)',
      },
      to: {
        path: '^src/features',
        pathNot: '^src/features/$1',
      },
    },
    {
      name: 'shared-ui-purity',
      severity: 'error',
      comment: 'Shared UI components cannot import from features (prevents coupling).',
      from: {
        path: '^src/components',
      },
      to: {
        path: '^src/features',
      },
    },
    {
      name: 'logic-ui-separation',
      severity: 'error',
      comment: 'Headless logic (src/lib) cannot import from UI/Features.',
      from: {
        path: '^src/lib',
      },
      to: {
        path: '^src/(components|features)',
      },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency injection, divide components in smaller parts, etc).',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'info',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Please remove it, or add" +
        " it to the dependency graph.",
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.app.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        theme: {
          graph: { rankdir: 'LR' },
        },
      },
    },
  },
};
