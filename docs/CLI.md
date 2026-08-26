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
| `cli-source` | CLI source/version to install (e.g. packed tarball path `./dependency-maritime-cli-0.0.0.tgz` or published package name/version) | *None* | **Yes** |
| `node-version` | Node.js version baseline to set up | `'20.19.0'` | No |
| `source-roots` | One or more source roots to analyze (space, newline, or comma separated) | `'src'` | No |
| `depcruise-config` | Optional path to custom dependency-cruiser configuration file | `''` | No |
| `output-dir` | Directory where `.maritime` output artifacts will be written | `'.maritime'` | No |
| `fail-on-unmeasured` | Strict measurement enforcement (fails if any implementation file is unmeasured) | `'true'` | No |
| `upload-artifact` | Whether to upload the generated `.maritime` directory as a workflow artifact | `'true'` | No |
| `artifact-name` | Name of the workflow artifact if `upload-artifact` is true | `'maritime-artifacts'` | No |

### Usage Examples

For an action checked out into the current repository, `uses:` points to the directory containing `action.yml` (for this repository root, `uses: ./`). In pre-release state, consumers must also provide an explicit packed CLI tarball or other resolvable CLI source. After public release, consumers can invoke the action by repository ref and set `cli-source` to the published package version.

#### Minimal Adoption (Local Action & Packed CLI)

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Build CLI Package
    run: |
      npm run build:cli
      npm pack
  - name: Maritime Analyze & Validate
    uses: ./
    with:
      cli-source: './dependency-maritime-cli-0.0.0.tgz'
```

#### Multiple Source Roots and Custom Config

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Maritime Analyze & Validate
    uses: ./
    with:
      cli-source: './dependency-maritime-cli-0.0.0.tgz'
      source-roots: 'src lib'
      depcruise-config: 'config/.dependency-cruiser.cjs'
      output-dir: '.maritime'
      fail-on-unmeasured: 'true'
      upload-artifact: 'true'
      artifact-name: 'maritime-analysis'
```

#### Verification Evidence and Consumer Cutover

The packed CLI has already been exercised against Catan Hex Mastery and Crawler Command Interface through their existing hand-rolled workflows. This PR adds and smoke-tests the shared action contract; it does not itself migrate those repositories to consume the action.

The executable action smoke test verifies that a packed Maritime tarball can be installed in a clean consumer workspace, analyzed across multiple source roots, validated, and emitted as the complete four-file `.maritime` bundle. Real-repository cutover remains a consumer-side follow-up so each repository can preserve its own trigger, baseline-commit, dependency-cruiser, and Graphviz behavior.

## Related documentation

- [Roadmap](./ROADMAP.md) — unfinished CLI delivery work and UI work.
- [Architecture](./ARCHITECTURE.md) — the boundary between the headless analyzer and the UI.
- [Complexity and Health Metrics](./COMPLEXITY.md) — metric definitions and repository evidence.
- [Development Guide](./DEVELOPMENT.md) — local setup and verification.
