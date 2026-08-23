# Build Integration and Report Artifacts

Dependency Maritime should support two independent workflows:

1. **Analyze in CI without starting the UI.** A project produces machine-readable metrics and a Markdown summary that can be archived, compared, or added to a pull request.
2. **Inspect interactively when needed.** The same project uploads its dependency-cruiser graph and metrics JSON to the hosted or locally running Dependency Maritime UI.

Keeping those workflows independent preserves the local-first, headless-logic architecture: analysis must not require React, a browser, or a running Dependency Maritime server.

## Recommended Distribution

The primary artifact should be a versioned **Node CLI package**, with a thin reusable **GitHub Actions workflow** as a convenience wrapper.

### CLI package (source of truth)

Publish a package such as `@dependency-maritime/cli` with a `maritime` binary:

```bash
npx @dependency-maritime/cli analyze \
  --source src \
  --graph artifacts/dependency-graph.json \
  --metrics artifacts/complexity-metrics.json \
  --report artifacts/complexity-report.md
```

The CLI is the correct abstraction because it works in GitHub Actions, GitLab CI, Jenkins, local pre-push checks, and AI-agent workflows. It should orchestrate dependency-cruiser and complexity collection, but keep calculation and formatting in importable, side-effect-free library functions.

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

Use a path-keyed map for per-file `complexity`, `loc`, `instability`, `fanIn`, and `fanOut`. Keep this separate from dependency-cruiser output so dependency-cruiser compatibility is not lost and additional analyzers can evolve independently.

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

Dependency Maritime should generalize the **refactoring-analysis pipeline**, not the React UI. The reusable product is a headless analyzer that produces versioned artifacts and refactoring deltas; the UI and CI workflows remain adapters around that contract.

### Current implementation

- [x] Extract metric calculation and Markdown rendering from the legacy CommonJS script into tested, side-effect-free TypeScript functions.
- [x] Add a `maritime analyze` command with explicit input and output paths.
- [x] Preserve the legacy `calculate:complexity` npm script through a compatibility shim.
- [x] Add unit coverage for calculations, ESLint-report parsing, Markdown rendering, and command orchestration.
- [ ] Validate dependency-cruiser graph structure before analysis. Invalid JSON or an unexpected graph shape must fail rather than produce an empty, healthy-looking report.
- [ ] Make ESLint invocation portable across supported platforms, including Windows, without using shell interpolation.
- [ ] Define and document command exit codes, including validation and analysis failures.
- [ ] Make the CLI package boundary real: add public exports, a `bin` entry, and a releaseable package layout. Do not publish the React application as the analyzer package.
- [ ] Add compatibility tests for supported Node, dependency-cruiser, and ESLint versions.

### Artifact and comparison roadmap

- [ ] Define Zod schemas for the versioned artifact manifest, report model, and optional baseline. Continue using dependency-cruiser's official `ICruiseResult` as the graph contract.
- [ ] Generate `manifest.json` with schema version, tool version, source root, generation time, and artifact file names.
- [ ] Add `maritime validate` to validate artifacts without running analysis.
- [ ] Add `maritime compare --baseline` to report absolute and percentage deltas for LOC, fan-in, fan-out, instability, and complexity.
- [ ] Add configurable policy gates that can fail on regressions. Keep the aggregate health score informational rather than the sole quality gate.
- [ ] Support a checked-in baseline and a downloaded CI baseline artifact.
- [ ] Add UI bundle upload: preserve raw graph upload, then accept a `.zip` artifact bundle so complexity metrics and comparison data load with the graph.
- [ ] Add a reusable GitHub Actions workflow only after the CLI/artifact contract is stable; other CI systems should call the same binary directly.
- [ ] Publish and release the analyzer with semantic versioning, provenance, changelog/release automation, and a compatibility policy.

### Cross-repository adoption

- [ ] Validate the CLI against at least two additional TypeScript repositories with meaningfully different layouts before publishing.
- [ ] Keep analyzer-specific integrations behind adapters: dependency-cruiser and ESLint for TypeScript, with a future Roslyn/.NET adapter able to emit the same normalized per-file metric artifact.
- [ ] Use baseline comparisons to demonstrate refactoring outcomes in real pull requests before expanding the metric model or UI.

## Suggested Delivery Order

- [x] **Increment 1 — Tested analyzer/report library and `maritime analyze`:** establishes the extraction seam and preserves the existing workflow.
- [ ] **Increment 1.1 — Correctness and portability hardening:** validate graph input, make ESLint launch cross-platform, and document exit codes.
- [ ] **Increment 2 — Versioned artifact manifest and UI bundle upload:** connects external builds to the UI through an explicit contract.
- [ ] **Increment 3 — Baseline comparison and regression policy:** produces useful before/after refactoring evidence.
- [ ] **Increment 4 — Cross-repository validation:** prove the CLI in distinct TypeScript repositories and stabilize the public API.
- [ ] **Increment 5 — Reusable GitHub workflow:** make adoption concise without embedding metric logic in YAML.
- [ ] **Increment 6 — Publication and release automation:** publish reproducible, versioned analyzer releases.

This order keeps the current work focused: first make the analyzer trustworthy and portable, then prove it across repositories, then make it convenient to consume.
