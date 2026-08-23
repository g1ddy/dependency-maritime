# Build Integration and Report Artifacts

Dependency Maritime should support two independent workflows:

1. **Analyze in CI without starting the UI.** A project produces machine-readable metrics and a Markdown summary that can be archived, compared, or added to a pull request.
2. **Inspect interactively when needed.** The same project uploads its dependency-cruiser graph and metrics JSON to the hosted or locally running Dependency Maritime UI.

Keeping those workflows independent preserves the local-first, headless-logic architecture: analysis must not require React, a browser, or a running Dependency Maritime server.

## Recommended Distribution

The primary artifact should be a versioned **Node CLI package**, with a thin reusable **GitHub Actions workflow** as a convenience wrapper.

### Supported environment

The first public CLI contract is intentionally modern and frontend-specific:

- Node.js `>=20.19.0`.
- ESLint 9+ with a flat `eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs`, or supported TypeScript flat config.
- dependency-cruiser output matching the supported `ICruiseResult` contract.
- Legacy `.eslintrc.*` and `eslintConfig` package metadata are unsupported. The CLI must fail with an actionable validation error that explains the flat-config requirement; it must not attempt a legacy compatibility mode.

ESLint 10 is the planned runtime target once its flat-config behavior is covered by the CLI integration suite. It no longer supports legacy `eslintrc`, which aligns with this contract.

### CLI package (source of truth)

Publish a package such as `@dependency-maritime/cli` with a `maritime` binary:

```bash
npx @dependency-maritime/cli analyze \
  --source src \
  --graph artifacts/dependency-graph.json \
  --metrics artifacts/complexity-metrics.json \
  --report artifacts/complexity-report.md
```

The CLI is the correct abstraction because it works in GitHub Actions, GitLab CI, Jenkins, local pre-push checks, and AI-agent workflows. It must be compiled to runnable Node ESM and expose a `bin` entry; consumers must not need `tsx` or this repository's source tree. The current `analyze` command consumes a validated dependency-cruiser graph. A higher-level graph-generation command or option can follow once the multi-root/config contract is established. Keep calculation and formatting in importable, side-effect-free library functions.

The package should expose a small programmatic API in addition to the binary:

```ts
import { analyzeProject, renderMarkdownReport } from '@dependency-maritime/cli';
```

Do not publish the React application as the analysis package. The UI has a different release cadence and dependency footprint. A monorepo can be considered later if the CLI and application genuinely diverge, as already anticipated in the design decisions.

### Reusable GitHub workflow (adapter)

After the CLI is stable, provide a reusable workflow that installs Node, runs the pinned CLI version, uploads the JSON and Markdown artifacts, and optionally writes the report to the GitHub Actions job summary. It may also compare a base artifact with the current result and comment a delta on pull requests.

The workflow must remain a wrapper around public CLI commands rather than contain metric logic. Consumers then get a short integration while retaining portability:

```yaml
jobs:
  maritime:
    uses: dependency-maritime/dependency-maritime/.github/workflows/analyze.yml@v1
    with:
      source: src
```

## Artifact Contract

Generate a directory that can be uploaded as one CI artifact:

```text
dependency-maritime/
├── dependency-graph.json
├── complexity-metrics.json
├── complexity-report.md
└── manifest.json
```

### `dependency-graph.json`

Use dependency-cruiser's official `ICruiseResult` JSON as the canonical relationship exchange format. The application already validates this shape and can upload it directly.

### `complexity-metrics.json`

Use a path-keyed map for per-file `complexity`, `loc`, `instability`, `fanIn`, and `fanOut`. Each TypeScript file must also distinguish a measured complexity value from a file skipped or ignored by ESLint; never silently substitute a default complexity of `1` for an unmeasured file. Keep this separate from dependency-cruiser output so dependency-cruiser compatibility is not lost and additional analyzers can evolve independently.

### `complexity-report.md`

Markdown is the human-facing artifact. It should contain the health score, hotspot tables, threshold violations, and—when a baseline is supplied—before/after deltas. This is the output intended for job summaries, pull-request comments, and project documentation.

### `manifest.json`

Add a versioned envelope so the UI and CI can reject incompatible artifact sets:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-21T00:00:00.000Z",
  "toolVersion": "1.0.0",
  "sourceRoot": "src",
  "files": {
    "graph": "dependency-graph.json",
    "metrics": "complexity-metrics.json",
    "report": "complexity-report.md"
  }
}
```

The UI should eventually accept either the graph JSON by itself or the complete artifact directory packaged as a `.zip`. A complete bundle enables the UI to show cyclomatic complexity and historical deltas that are not part of dependency-cruiser's graph schema.

## Implementation Checklist

Dependency Maritime should generalize the **frontend refactoring-analysis pipeline**, not the React UI. The reusable product is a headless TypeScript analyzer that produces versioned artifacts and refactoring deltas; the UI and CI workflows remain adapters around that contract.

### Current implementation

- [x] Extract metric calculation and Markdown rendering from the legacy CommonJS script into tested, side-effect-free TypeScript functions.
- [x] Add a `maritime analyze` command with explicit input and output paths.
- [x] Preserve the legacy `calculate:complexity` npm script through a compatibility shim.
- [x] Add unit coverage for calculations, ESLint-report parsing, Markdown rendering, command orchestration, graph validation, and ESLint API failures.
- [x] Validate dependency-cruiser graph structure before analysis. Invalid JSON or an unexpected graph shape fails with exit code `2`.
- [x] Replace shell-based ESLint invocation with the ESLint Node API.
- [x] Define and document the current CLI arguments and exit codes.

### Modern CLI readiness

- [x] Enforce the supported environment at startup: Node.js `>=20.19.0`, ESLint 9+ flat config, and supported dependency-cruiser output.
- [x] Detect legacy `.eslintrc.*` or `eslintConfig` metadata and fail with an actionable exit-code-`2` message. Legacy configuration support is deliberately out of scope.
- [x] Reject a missing flat config at validation time with exit code `2`, rather than deferring to an ESLint runtime error.
- [x] Track complexity measurement status. A graph TypeScript file skipped or ignored by ESLint is warned about, represented as unmeasured, and can fail the command with `--fail-on-unmeasured`.
- [x] Treat graph paths that no longer exist or cannot be linted as unmeasured rather than aborting with an ESLint file-match error.
- [x] Restrict complexity measurement and unmeasured-file checks to supported TypeScript implementation files (`.ts` and `.tsx`); declaration and test-file exclusions are explicit.
- [x] Render measured and unmeasured counts accurately in the Markdown report, including a skipped-file list.
- [x] Log the raw and normalized source root(s) alongside the working directory, graph path, and ESLint config mode.
- [ ] Support multiple source roots or an explicit local-module include pattern. Repositories with `app/`, `src/`, `worker/`, or other split layouts must not require an implicit whole-repository scan.
- [ ] Make graph scoping explicit so npm packages and Node built-ins cannot contaminate local-file reports.
- [ ] Add a graph-generation command or option that can use a repository-supplied dependency-cruiser config. Retain `--graph` as the low-level artifact-input path.
- [ ] Make the CLI package boundary real: compile Node ESM, add public exports and a `bin` entry, and remove the consumer dependency on `tsx` or the React application's source tree.
- [ ] Verify an `npm pack` tarball installed into a clean fixture repository before publishing.

### Integration coverage

- [x] Add a flat-config fixture that exercises successful analysis.
- [x] Add an ESLint-ignore fixture and assert that ignored TypeScript graph files are reported as unmeasured.
- [x] Add a legacy-`eslintrc` fixture that asserts the intentional, helpful rejection.
- [x] Add fixtures for a missing graph path, a non-TypeScript graph file, and a missing flat config.
- [ ] Add a multi-root Next/Vite-style fixture.
- [ ] Run the integration suite on supported Node 20, 22, and 24 versions.
- [ ] Validate supported dependency-cruiser versions and representative configuration layouts before publishing.

#### Forward compatibility

- [ ] Upgrade the analyzer's own ESLint runtime to v10 after the distributed-CLI integration suite covers its flat-config behavior. This is intentionally post-MVP and does not block ESLint 9 package delivery.

## Artifact and comparison roadmap

- [ ] Define Zod schemas for the versioned artifact manifest, report model, and optional baseline. Continue using dependency-cruiser's official `ICruiseResult` as the graph contract.
- [ ] Generate `manifest.json` with schema version, tool version, source root(s), generation time, and artifact file names.
- [ ] Add `maritime validate` to validate artifacts without running analysis.
- [ ] Add `maritime compare --baseline` to report absolute and percentage deltas for LOC, fan-in, fan-out, instability, and complexity.
- [ ] Add configurable policy gates that can fail on regressions. Keep the aggregate health score informational rather than the sole quality gate.
- [ ] Support a checked-in baseline and a downloaded CI baseline artifact.
- [ ] Add UI bundle upload: preserve raw graph upload, then accept a `.zip` artifact bundle so complexity metrics and comparison data load with the graph.
- [ ] Add a reusable GitHub Actions workflow only after the CLI/artifact contract is stable; other CI systems should call the same binary directly.
- [ ] Publish and release the analyzer with semantic versioning, provenance, changelog/release automation, and a compatibility policy.

### Cross-repository adoption

- [x] Validate the current analyzer against a multi-root frontend repository with ESLint 9 flat config (Crawler Command Interface).
- [x] Validate the analyzer against Catan Hex Mastery after its ESLint 9 flat-config migration.
- [ ] Validate the packaged CLI against at least two additional ESLint 9+ flat-config TypeScript frontend repositories before publishing.
- [ ] Keep the public contract focused on TypeScript frontend repositories: dependency-cruiser for dependency graphs and ESLint for complexity. A non-JavaScript adapter is out of scope for this roadmap.
- [ ] Use baseline comparisons to demonstrate refactoring outcomes in real pull requests before expanding the metric model or UI.

## Suggested Delivery Order

- [x] **Increment 1 — Tested analyzer/report library and `maritime analyze`:** establishes the extraction seam and preserves the existing workflow.
- [x] **Increment 1.1 — Correctness and portability hardening:** validate graph input, replace the shell runner, and document the command contract.
- [x] **Increment 1.2 — Modern support boundary and measurement integrity:** enforce the Node/ESLint 9+ contract; diagnose source roots; represent ignored, stale, and unmatchable TypeScript files accurately; and report measurement coverage.
- [ ] **Increment 2 — Distributable CLI:** compile Node ESM, add the binary/package exports, support explicit working directories and multi-root analysis, and test an `npm pack` installation.
- [ ] **Increment 3 — Graph integration and fixture matrix:** support repository dependency-cruiser configuration, protect local graph scope, and verify the supported Node/ESLint/dependency-cruiser matrix.
- [ ] **Increment 3.1 — ESLint 10 compatibility:** upgrade the analyzer runtime after the distributable CLI's integration suite makes the compatibility contract verifiable.
- [ ] **Increment 4 — Versioned artifact manifest and UI bundle upload:** connect external builds to the UI through an explicit contract.
- [ ] **Increment 5 — Baseline comparison and regression policy:** produce useful before/after refactoring evidence.
- [ ] **Increment 6 — Reusable GitHub workflow and publication:** make adoption concise, then publish reproducible, versioned analyzer releases.

This order makes the CLI trustworthy and distributable before introducing higher-level CI or UI conveniences.
