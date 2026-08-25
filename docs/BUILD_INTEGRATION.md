# Build Integration and Report Artifacts

Dependency Maritime should support two independent workflows:

1. **Analyze in CI without starting the UI.** A project produces machine-readable metrics and a Markdown summary that can be archived, compared, or added to a pull request.
2. **Inspect interactively when needed.** The same project uploads its dependency graph and metrics to the hosted or local Dependency Maritime UI.

Analysis must not require React, a browser, or a running Dependency Maritime server. The reusable product is the headless TypeScript analyzer; the UI and CI integrations are adapters around its artifact contract.

## Distribution target

The primary artifact is a versioned Node CLI package, `@dependency-maritime/cli`, exposing the `maritime` binary and a small programmatic API. A reusable GitHub Actions workflow should come later as a thin wrapper around public CLI commands.

### Supported environment

The first public contract is intentionally modern and frontend-specific:

- Node.js `>=20.19.0`.
- ESLint 9+ with flat configuration.
- TypeScript frontend repositories.
- dependency-cruiser as the dependency-graph engine and `ICruiseResult` as the canonical graph exchange format.
- Legacy `.eslintrc.*` and `eslintConfig` package metadata are unsupported.

ESLint is required at runtime and must resolve from a clean consumer installation. ESLint 10 remains a post-MVP compatibility target.

## CLI contract

The low-level artifact-input path remains supported:

```bash
maritime analyze \
  --source src \
  --graph artifacts/dependency-graph.json \
  --metrics artifacts/complexity-metrics.json \
  --report artifacts/complexity-report.md
```

However, this is not sufficient as the primary distribution experience. A consumer should not need to separately install dependency-cruiser, reverse-engineer a graph command, and manually stage an input graph before Maritime can analyze the repository.

Increment 3 therefore promotes graph generation into the normal analyzer workflow while retaining `--graph` for reproducible, advanced, and CI artifact-input use cases. The target consumer experience is conceptually:

```bash
maritime analyze --source app --output .maritime
```

which produces the dependency graph, metrics, and report itself. Graph generation must support repository-supplied dependency-cruiser configuration without assuming Dependency Maritime's own `src/`, `tsconfig.app.json`, or architectural rules.

The package should also expose side-effect-free programmatic APIs such as:

```ts
import { analyzeProject, renderMarkdownReport } from '@dependency-maritime/cli';
```

Do not publish the React application as the analysis package.

## Artifact contract

The normal analysis output is a single self-contained artifact directory:

```text
.maritime/
├── dependency-graph.json
├── complexity-metrics.json
├── complexity-report.md
└── manifest.json
```

Every successful `maritime analyze` invocation produces an output directory where `manifest.json`, the dependency graph JSON, complexity metrics JSON, and Markdown report all reside within that directory. All manifest-declared artifact paths are relative to the artifact directory and must not contain path traversal (e.g., `..`) or absolute paths.

When `--graph <file>` is supplied outside `--output <dir>`, the validated supplied graph is staged (copied) into the output directory and referenced in the manifest as a relative path inside that directory. The original caller graph file is never modified or removed. If staging cannot be completed, analysis fails with a non-zero exit code without emitting a manifest.

### `dependency-graph.json`

Use dependency-cruiser's official `ICruiseResult` JSON as the canonical relationship exchange format. Graph scope must represent local project files without npm packages or Node built-ins contaminating local-file metrics.

### `complexity-metrics.json`

Use a path-keyed map for per-file `complexity`, `loc`, `instability`, `fanIn`, and `fanOut`. Each supported TypeScript implementation file must distinguish measured complexity from skipped, ignored, stale, or fatally unmeasured ESLint results.

### `complexity-report.md`

The human-facing report contains health information, hotspots, threshold violations, measurement coverage, and eventually baseline deltas.

### `manifest.json`

A versioned envelope containing schema version, tool version, source roots, generation time, summary metrics, and declared artifact filenames so CI and the UI can validate output directories:

```json
{
  "schemaVersion": "1.0.0",
  "toolVersion": "0.0.0",
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "sourceRoots": ["src"],
  "artifacts": {
    "graph": "dependency-graph.json",
    "metrics": "complexity-metrics.json",
    "report": "complexity-report.md"
  },
  "summary": {
    "totalFiles": 42,
    "healthScore": 95.5,
    "scannedCount": 42,
    "skippedCount": 0
  }
}
```

## Validation contract

The `maritime validate` command validates a Maritime artifact output directory without executing repository analysis or importing UI dependencies:

```bash
maritime validate .maritime
```

It verifies:
1. `manifest.json` exists and validates against `ArtifactManifestSchema` matching the supported `schemaVersion` (`1.0.0`).
2. Artifact paths declared in `manifest.json` do not escape the artifact directory via path traversal (e.g., `../outside.json`).
3. Declared artifact files (`graph`, `metrics`, `report`) exist within the directory.
4. `dependency-graph.json` validates against `CruiseResultSchema` and `complexity-metrics.json` validates against `ComplexityMetricsMapSchema`.

Exit codes:
- `0`: Successful validation.
- `1`: Operational or runtime failure.
- `2`: Invalid CLI arguments, missing/malformed manifest, unsupported schema version, path escaping, or schema validation error.

## CI contract checks and triggering contract

Maritime enforces CI contract verification for all changes affecting the distributable CLI package and artifact contract.

### Workflow triggers

CLI contract checks are executed via a dedicated GitHub Actions workflow (`.github/workflows/cli-contract.yml`) and integrated into general CI (`.github/workflows/ci.yml`). Workflow dispatches are reliably triggered on `push` to `main` and `pull_request` whenever any of the following paths are modified:

- `src/cli/**`
- `src/schema/**`
- `tests/cli-pack-smoke.test.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.cli.json`
- `.github/workflows/**`

Documentation-only PRs (modifying strictly `docs/**` or `*.md`) intentionally bypass the full 3-node compatibility matrix to avoid unnecessary build queues, while any pull request modifying CLI, schema, test, configuration, or workflow files is guaranteed to execute the contract checks.

### Required execution contract

The CLI contract check executes:

1. `npm run build:cli`
2. `npm run test:cli-package`

across the supported Node.js compatibility matrix (`20.19.0`, `22.x`, `24.x`) with `fail-fast: false`.

### Root-cause diagnosis and remediation (PR #221)

PR #221 modified files in `src/cli/` and `src/schema/` but did not record a GitHub Actions workflow run. Investigation identified the following root causes:

1. **Permission restrictions on fork PRs**: Top-level `permissions: contents: write` in `.github/workflows/ci.yml` prevented GitHub Actions from executing workflow dispatches for fork pull requests or restricted pull-request tokens.
2. **Missing explicit build step**: Workflows lacked an explicit `npm run build:cli` step prior to running `npm run test:cli-package`, obscuring build status in workflow execution steps.
3. **Automated commit suppression (`[skip ci]`)**: Automated commits pushed by external workflows with `[skip ci]` in the commit message suppressed workflow dispatch for pull request head commits.
4. **Missing explicit path filter contract**: General workflows lacked explicit path trigger declarations targeting CLI-specific build and schema inputs.

**Remediation applied**:
- Created a dedicated `.github/workflows/cli-contract.yml` workflow with explicit path triggers and top-level `permissions: contents: read`.
- Explicitly added `npm run build:cli` as a dedicated workflow step before `npm run test:cli-package`.
- Configured `.github/workflows/ci.yml` to set top-level `permissions: contents: read` while restricting `contents: write` permissions strictly to the `build-and-test` release tagging step.
- Configured `paths-ignore: ['docs/**', '*.md']` on `ci.yml` pull-request triggers to skip heavy matrix runs for doc-only changes without bypassing source or CLI changes.

## Current implementation status

### Analyzer and correctness

- [x] Extract metric calculation and Markdown rendering into tested TypeScript functions.
- [x] Add `maritime analyze` with explicit graph/input/output paths.
- [x] Validate dependency-cruiser graph structure and use explicit exit codes.
- [x] Replace shell-based ESLint invocation with the ESLint Node API.
- [x] Enforce Node `>=20.19.0`, ESLint 9+ flat config, and reject legacy ESLint configuration.
- [x] Track skipped/ignored/stale graph files as unmeasured and support `--fail-on-unmeasured`.
- [x] Support repeatable `--source` roots and log raw/normalized roots.
- [x] Treat ESLint fatal parsing/configuration results as unmeasured rather than scanned complexity `1`.
- [x] Restrict measurement and unmeasured checks to the explicit supported implementation-file contract and preserve an explicitly empty graph selection.

### Distributable package boundary

PRs #207 and #210 established the package boundary needed for external consumption:

- [x] Compile runnable Node ESM and expose the `maritime` binary.
- [x] Expose programmatic exports with NodeNext-resolvable declarations.
- [x] Stage a CLI-specific package manifest rather than publishing the React application's dependency surface.
- [x] Keep UI-only React/Radix/D3/ELK/Tailwind dependencies out of the consumer runtime dependency set.
- [x] Make ESLint 9+ a required peer/runtime contract.
- [x] Add clean-install packed-tarball smoke coverage and consumer type checking.
- [x] Regenerate package metadata/lockfile for the package boundary.

The package boundary and normal generated-graph path have now been proven against packed external consumers. The package remains private/version `0.0.0`; public release still requires the supported runtime/configuration matrix and the later release work described below.

## Increment 3 — Real-consumer graph integration

**Complete.** The packed CLI has passed representative external-consumer proof and the supported Node runtime matrix. Increment 4 may now begin; additional configuration-shape hardening is tracked separately in issue #217.

### Graph generation

- [x] Add a graph-generation path to `maritime analyze` (or a cohesive public command) so ordinary consumers do not need to manually invoke dependency-cruiser.
- [x] Retain `--graph` as the low-level pre-generated artifact path.
- [x] Discover or explicitly accept a repository-supplied dependency-cruiser config.
- [x] Define portable fallback graph-generation behavior when no consumer config exists.
- [x] Ensure Dependency Maritime's own `config/.dependency-cruiser.cjs` remains repository-specific architecture policy and never becomes an implicit consumer default.
- [x] Protect graph scope so external packages and Node built-ins do not contaminate local metrics.
- [x] Define dependency-cruiser packaging/version ownership: a normal Maritime install must contain everything needed for graph generation.

### Real-consumer proof

The acceptance test must use the **packed CLI**, not imports from the Maritime checkout and not fixtures nested beneath its `node_modules` tree.

- [x] Pack the CLI from a clean Maritime build.
- [x] Install that tarball into a clean checkout/fixture representing Crawler Command Interface.
- [x] Analyze Crawler's `app/` source root using its ESLint 9 flat config and repository conventions.
- [x] Produce a dependency graph, complexity metrics, and Markdown report without copying Maritime-specific config into Crawler.
- [x] Assert meaningful coverage and verify representative Crawler modules appear in the graph/metrics.
- [x] Repeat the same packed-consumer workflow against Catan Hex Mastery.
- [x] Prove both consumers use the same public Maritime invocation except for legitimate repository-specific source/config options.

Crawler and Catan have now both passed this packed-consumer proof. Catan's comparison output measured 112 of 112 supported implementation files, with no unmeasured files and a 91.0 health score; its older hand-rolled score is intentionally not a numeric regression target. Catan's consumer integration is tracked in [catan-hex-mastery#436](https://github.com/g1ddy/catan-hex-mastery/pull/436).

Crawler remains a strong compatibility target: Node 22, TypeScript 5.9, ESLint 9 flat config, Next/Vite/Vinext tooling, an `app/` source root, and mixed UI/domain code. Passing an internal Crawler-shaped fixture is not equivalent to passing this consumer contract.

### Compatibility matrix

- [x] Add integration coverage on supported Node 20, 22, and 24 versions.
- [x] Validate the packaged dependency-cruiser runtime with representative consumer configuration and portable fallback graph generation.
- [x] Add fixtures for fatal ESLint results and explicitly empty supported-file selections.

### Post-Increment-3 compatibility hardening

The following work improves confidence before public publishing but does not block Increment 4's versioned artifact contract:

- [x] Validate explicit CJS and ESM dependency-cruiser configuration layouts and generated-graph multi-root behavior ([#217](https://github.com/g1ddy/dependency-maritime/issues/217)).
  - Clean-install packed CLI integration smoke coverage verifies explicit CJS (`config/dependency-cruiser.cjs`), explicit ESM (`dependency-cruiser.config.mjs`), and portable fallback graph generation.
  - Multi-root generated-graph fixtures verify repeatable `--source` options with consumer dependency-cruiser configuration, ensuring local metrics include all selected roots (`app/`, `components/`, `lib/`), including unreferenced implementation files in each additional root; exclude unselected source trees (`outside/`); and succeed with `--fail-on-unmeasured`.
- [ ] Validate the packaged CLI against at least two additional ESLint 9+ flat-config TypeScript frontend repositories before public publishing.

## Later roadmap

### Increment 4 — Versioned artifact manifest and UI bundle upload

- [x] Define Zod schemas for the manifest/report model.
- [x] Generate `manifest.json` with schema/tool versions, source roots, generation time, and filenames.
- [x] Add `maritime validate`.
- [ ] Preserve raw graph upload and add complete `.zip` bundle upload to the UI.

### Increment 5 — Baseline comparison and regression policy

- [ ] Add `maritime compare --baseline` with absolute and percentage deltas.
- [ ] Add configurable regression policy gates.
- [ ] Support checked-in and downloaded CI baselines.
- [ ] Demonstrate before/after refactoring evidence in real pull requests.

### Increment 6 — CI adapter and public release

- [ ] Add a reusable GitHub Actions workflow only after the CLI/artifact contract is stable.
- [ ] Remove the private/pre-release package state when release criteria are satisfied.
- [ ] Publish with semantic versioning, provenance, changelog/release automation, and a compatibility policy.

### Increment 6.1 — ESLint 10 compatibility

- [ ] Upgrade/validate ESLint 10 after the distributed integration suite can verify its flat-config behavior.

## Release gate

Do not describe Maritime as publicly distribution-ready merely because `npm pack` succeeds. Public release requires all of the following:

1. A clean consumer can install the packed/published CLI without UI dependencies.
2. The normal CLI path can generate its own dependency graph or deliberately consume a supplied one.
3. Crawler Command Interface and Catan Hex Mastery pass end-to-end through the packed CLI from outside the Maritime repository tree.
4. Local graph scoping and measurement integrity are enforced.
5. The required Node/ESLint/dependency-cruiser runtime compatibility matrix passes.

Increment 4 may proceed once these gates pass. The remaining configuration-shape hardening and additional-repository validation stay required before public package release.
