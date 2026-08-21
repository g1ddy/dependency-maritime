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

## Remaining Implementation Work

The repository has several useful pieces today, but they are coupled to this repository's paths and documentation file:

1. **Extract headless analysis.** Move metric calculation and Markdown rendering from the current CommonJS script into tested TypeScript functions that accept explicit inputs and return data rather than writing fixed paths.
2. **Create a CLI entry point.** Add `analyze`, `compare`, and `validate` commands with documented exit codes. `analyze` produces the artifact set; `compare` renders before/after deltas; `validate` checks schemas without running analysis.
3. **Define versioned schemas.** Add Zod schemas for the artifact manifest, report model, and optional baseline. Continue using the official dependency-cruiser result as the graph contract.
4. **Implement baseline comparison.** Support a committed baseline or a downloaded CI artifact and report absolute and percentage changes for LOC, fan-in, fan-out, instability, and complexity.
5. **Add configurable policy gates.** Read thresholds from a checked-in configuration file and optionally fail only on regressions. Avoid making an arbitrary aggregate health score the sole build gate.
6. **Add bundle upload to the UI.** Preserve raw graph upload, then add `.zip` ingestion so graph and complexity metrics are loaded together.
7. **Publish and release.** Add package exports, a `bin` entry, semantic versioning, provenance, changelog/release automation, and compatibility tests against supported Node and dependency-cruiser versions.
8. **Add reusable CI adapters.** Implement GitHub Actions only after the CLI contract is tested; other CI systems can call the same binary directly.

## Suggested Delivery Order

| Increment | Deliverable | Why first |
| :--- | :--- | :--- |
| 1 | Tested analyzer/report library plus `maritime analyze` | Establishes the portable source of truth. |
| 2 | Versioned artifact manifest and UI bundle upload | Connects external builds to the existing UI. |
| 3 | `maritime compare` and regression policy | Produces the before/after refactoring evidence shown in complexity baselines. |
| 4 | Reusable GitHub workflow | Makes adoption easy without coupling the product to GitHub. |
| 5 | npm publication and automated releases | Makes versions reproducible for external consumers. |

This sequence delivers build-process value before adding more visualization features and does not require the full UI to run in CI.
