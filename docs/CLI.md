# CLI and Artifact Contract

Dependency Maritime should support two independent workflows:

1. **Analyze in CI without starting the UI.** A project produces machine-readable metrics and a Markdown summary that can be archived, compared, or added to a pull request.
2. **Inspect interactively when needed.** The same project uploads its dependency graph and metrics to the hosted or local Dependency Maritime UI.

Analysis must not require React, a browser, or a running Dependency Maritime server. The reusable product is the headless TypeScript analyzer; the UI and CI integrations are adapters around its artifact contract.

## Distribution target

The primary artifact is a versioned Node CLI package, `@dependency-maritime/cli`, exposing the `maritime` binary and a small programmatic API. A reusable GitHub Actions integration (`action.yml`) provides a thin, UI-independent wrapper around public CLI commands.

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

### Measurement completeness

`maritime validate` confirms that an artifact bundle is structurally valid; it does not require every selected implementation file to have a complexity measurement. For authoritative CI evidence and refactoring gates, run analysis with `--fail-on-unmeasured`:

~~~bash
maritime analyze --source src --output .maritime --fail-on-unmeasured
maritime validate .maritime
~~~

This makes analysis fail when a selected supported TypeScript implementation file is skipped, ignored, stale, or has a fatal ESLint parsing/configuration error. Use it whenever the report will be treated as complete measurement evidence; omit it only when partial exploratory output is intentional.

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

## Release requirements

A public release requires all of the following:

1. A clean consumer can install the packed/published CLI without UI dependencies.
2. The normal CLI path can generate its own dependency graph or deliberately consume a supplied one.
3. Representative external consumers pass end-to-end through the packed CLI outside the Maritime repository tree.
4. Local graph scoping and measurement integrity are enforced.
5. The required Node, ESLint, and dependency-cruiser runtime compatibility matrix passes.

## GitHub Actions Integration

Dependency Maritime provides an official composite action (`action.yml`) that wraps `maritime analyze` and `maritime validate` into a reusable GitHub Actions step without importing React or UI dependencies.

### Action Inputs

| Input | Description | Default | Required |
| :--- | :--- | :--- | :--- |
| `cli-source` | Optional development override (for example a packed CLI tarball or another exact package version) | `''` | No |
| `node-version` | Node.js version baseline to set up | `'20.19.0'` | No |
| `source-roots` | One or more source roots to analyze (space, newline, or comma separated) | `'src'` | No |
| `depcruise-config` | Optional path to custom dependency-cruiser configuration file | `''` | No |
| `output-dir` | Directory where `.maritime` output artifacts will be written | `'.maritime'` | No |
| `fail-on-unmeasured` | Strict measurement enforcement (fails if any implementation file is unmeasured) | `'true'` | No |
| `upload-artifact` | Whether to upload the generated `.maritime` directory as a workflow artifact | `'true'` | No |
| `artifact-name` | Name of the workflow artifact if `upload-artifact` is true | `'maritime-artifacts'` | No |
| `render-graph` | Render the validated graph on the supported Ubuntu rendering path | `'false'` | No |
| `graph-output` | Destination for the derived SVG | `'docs/images/dependency-graph.svg'` | No |

### Usage Examples

Versioned action tags and development refs resolve differently. A `cli-vX.Y.Z[-pre]` tag is
authoritative and makes the action install the matching exact `@dependency-maritime/cli@X.Y.Z[-pre]`
version dynamically. A branch or commit SHA cannot encode a package version, so it retains the
committed `@dependency-maritime/cli@0.1.0-beta.1` last-known-compatible development fallback. That
fallback is not advanced for each release. Consumers pinning an unreleased action SHA may instead
pair it explicitly with the compatible exact package through `cli-source`.

#### Normal consumer workflow

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Maritime Analyze & Validate
    uses: g1ddy/dependency-maritime@<pinned-ref>
    with:
      source-roots: src
```

#### Multiple Source Roots and Custom Config

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Maritime Analyze & Validate
    uses: g1ddy/dependency-maritime@<pinned-ref>
    with:
      source-roots: 'src lib'
      depcruise-config: 'config/.dependency-cruiser.cjs'
      output-dir: '.maritime'
      fail-on-unmeasured: 'true'
      upload-artifact: 'true'
      artifact-name: 'maritime-analysis'
```

For Maritime development and unreleased compatibility checks only, set `cli-source` to an exact
package specifier or a packed tarball. This override is not part of normal consumer setup:

```yaml
    uses: g1ddy/dependency-maritime@<pinned-ref>
    with:
      cli-source: './dependency-maritime-cli-0.1.0-beta.3.tgz'
```

The prerelease is published from the tag-triggered `Publish CLI prerelease` workflow. The
`cli-vX.Y.Z[-pre]` tag is the release-version authority; the workflow stamps that version into
`package.json` and `package-lock.json` only in its ephemeral release workspace, then builds,
exercises the packed-package contract, and publishes with npm provenance under the `prerelease`
distribution tag. For this feature, pushing `cli-v0.1.0-beta.3` therefore publishes beta.3 without
committing a beta.3 package-version bump or changing the branch/SHA fallback. The workflow then
checks out the exact released tag and runs a clean external consumer job without `cli-source`, so
the tag-derived action resolution installs and exercises the just-published version while verifying
all four canonical `.maritime` artifacts and the rendered graph. The action selects the full
immutable CLI version rather than the distribution tag.

#### Verification Evidence and Consumer Cutover

The packed CLI has already been exercised against Catan Hex Mastery and Crawler Command Interface through their existing hand-rolled workflows. This PR adds the shared action contract and the release-time external consumer proof; it does not itself migrate those repositories to consume the action.

The package-contract smoke suite runs before publication and verifies package contents, runtime
dependencies, supported Node versions, source-root behavior, validation, and action execution with a
local prerelease tarball fixture. The true no-input action path is intentionally proven only after the
prerelease is published: the tag-triggered release workflow invokes the action without `cli-source`
and validates the complete four-file `.maritime` bundle. The standalone manually dispatched consumer
smoke remains useful as a post-release diagnostic once the workflow exists on the default branch, but
it is not the pre-merge acceptance proof. Real-repository cutover remains a consumer-side follow-up so
each repository can preserve its own trigger, baseline-commit, dependency-cruiser, and Graphviz behavior.

## Related documentation

- [Roadmap](./ROADMAP.md) — unfinished CLI delivery work and UI work.
- [Architecture](./ARCHITECTURE.md) — the boundary between the headless analyzer and the UI.
- [Complexity and Health Metrics](./COMPLEXITY.md) — metric definitions and repository evidence.
- [Development Guide](./DEVELOPMENT.md) — local setup and verification.

## Supported graph rendering

Render a presentation directly from existing canonical evidence:

```bash
maritime graph --input .maritime --output docs/images/dependency-graph.svg
maritime graph --input .maritime/dependency-graph.json --output docs/images/dependency-graph.svg
```

For an artifact-directory input, `maritime graph` validates the bundle and reads the graph path
declared by `manifest.json`; an explicit JSON input is also supported. It never runs
dependency-cruiser or a second structural scan. The JSON remains canonical machine-readable evidence, while SVG (or explicit
DOT debug output) is derived presentation and must not be hand-edited. The exported pure
`renderDependencyGraphToDot(graph)` function recursively derives directory clusters, preserves
unfamiliar local paths, collapses `node_modules` paths to package nodes, deterministically sorts all
output, and retains available dependency-kind, type-only, circular, and validity edge semantics.

SVG rendering requires Graphviz `dot` on `PATH`; Graphviz is not bundled in the npm package. The CLI
reports an actionable error when it is missing. Maritime normalizes Graphviz's generator-version
comment, but byte-for-byte SVG stability still depends on keeping the Graphviz version fixed.

The composite action adds two optional inputs:

| Input | Description | Default |
| :--- | :--- | :--- |
| `render-graph` | Render after successful analysis and validation | `'false'` |
| `graph-output` | Derived SVG destination | `'docs/images/dependency-graph.svg'` |

```yaml
- uses: g1ddy/dependency-maritime@<pinned-ref>
  with:
    source-roots: 'app src'
    output-dir: '.maritime'
    render-graph: 'true'
    graph-output: 'docs/images/dependency-graph.svg'
```

Rendering is opt-in. The supported reproducible path is `ubuntu-latest`, where the action requests
Graphviz `2.42.2-9ubuntu0.1`; identical Graphviz selection and byte-for-byte committed SVG output are
not guaranteed on macOS or Windows runners. The SHA-pinned `ts-graphviz/setup-graphviz@v2` step
currently runs on GitHub's deprecated Node 20 Actions runtime (GitHub forces Node 24 and emits a
warning), so this setup mechanism is not presented as a long-term cross-runner portability guarantee.
The action renders the newly generated graph and includes the requested presentation in artifact
upload behavior. It never commits consumer files. Generic test fixtures validate Maritime's
own usage, Crawler Command Interface's deterministic external-package use case, and Catan Hex
Mastery's recursive feature/component/hook hierarchy. Consumer repository migrations remain
follow-up work.
