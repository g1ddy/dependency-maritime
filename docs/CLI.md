# CLI and Artifact Contract

Dependency Maritime supports two independent workflows:

1. **Analyze in CI without starting the UI.** A project produces machine-readable metrics and a Markdown summary that can be archived, compared, or added to a pull request.
2. **Inspect interactively when needed.** The same project uploads its dependency graph and metrics to the hosted or local Dependency Maritime UI.

Analysis does not require React, a browser, or a running Dependency Maritime server. The reusable product is the headless TypeScript analyzer; the UI and CI integrations are adapters around its artifact contract.

## Ownership Boundary

* **`docs/CLI.md` (This Document) Owns:** Public CLI commands, arguments, artifact bundle schemas, manifest envelope, validation rules, Action input/output mapping, runtime requirements, release criteria, and exit behavior.
* **`docs/GRAPH_PROFILES.md` Owns:** Named graph presentation profiles (`default`, `local-architecture`, `compact-architecture`, `architecture-overview`), rendering presets, and presentation-only override switch semantics.

---

## Distribution target

The primary artifact is a versioned Node CLI package, `@dependency-maritime/cli`, exposing the `maritime` binary and a small programmatic API. A reusable GitHub Actions integration (`action.yml`) provides a thin, UI-independent wrapper around public CLI commands.

### Supported environment

The public contract is intentionally modern and frontend-specific:

- Node.js `^22.13.0 || ^24.0.0`. Node 22.13 is the API and runtime floor; Node 24 is the forward-compatibility target.
- ESLint 9+ with flat configuration.
- TypeScript frontend repositories.
- dependency-cruiser as the dependency-graph engine and `ICruiseResult` as the canonical graph exchange format.
- Legacy `.eslintrc.*` and `eslintConfig` package metadata are unsupported.

ESLint is required at runtime and must resolve from a clean consumer installation. ESLint 10 remains a post-MVP compatibility target.

APIs introduced after Node 22.13 cannot become required behavior until Maritime raises its runtime floor. Compile-time Node APIs follow the same rule: `@types/node` is pinned to the 22.13 minor family rather than tracking the newest release. Keep that pin synchronized with `engines.node`, runtime validation, `.nvmrc`, the composite Action baseline, and the CI matrix. When terminal styling materially improves a diagnostic, use the stable `node:util` `styleText()` API instead of adding a color-only dependency.

### Permission Model capability reference

Node's stable Permission Model is executable capability documentation and defense in depth; it is not a sandbox for running malicious repository configuration. Packaged smoke tests exercise these minimum command capabilities:

- `analyze` reads the selected project inputs plus its installed package/tooling tree, and receives write access only to the configured artifact directory. Repository-supplied analyzer or ESLint configuration may itself require additional capabilities.
- `validate` reads the evidence directory and installed Maritime runtime metadata, with no file write access.
- `graph` reads canonical evidence and installed Maritime runtime metadata, and writes only the requested output directory. DOT output needs no subprocess capability; SVG output additionally requires `--allow-child-process` so Maritime can invoke Graphviz `dot`.

## CLI contract

The low-level artifact-input path remains supported:

```bash
maritime analyze \
  --source src \
  --graph artifacts/dependency-graph.json \
  --metrics artifacts/complexity-metrics.json \
  --report artifacts/complexity-report.md
```

However, a consumer should not need to separately install dependency-cruiser, reverse-engineer a graph command, and manually stage an input graph before Maritime can analyze the repository.

Normal analyzer workflow promotes graph generation directly into analysis while retaining `--graph` for reproducible, advanced, and CI artifact-input use cases:

```bash
maritime analyze --source app --output .maritime
```

### Architecture Debt & PR Impact Flags

```bash
# Evaluate architecture debt against a known baseline and fail if new violations exist
maritime analyze --source src --output .maritime --baseline .maritime/baseline.json --fail-on-new-violations

# Establish or record a new baseline of architecture violations
maritime analyze --source src --output .maritime --write-baseline .maritime/baseline.json

# Calculate PR change impact surface relative to Git base revision
maritime analyze --source src --output .maritime --base origin/main
```

Graph generation supports repository-supplied dependency-cruiser configuration without assuming Dependency Maritime's own `src/`, `tsconfig.app.json`, or architectural rules.

The package also exposes programmatic APIs:

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

When `--graph <file>` is supplied outside `--output <dir>`, Maritime validates and normalizes the supplied graph, then serializes the normalized representation into the output directory and references it from the manifest using a relative path. The original caller graph file is never modified or removed. If canonical serialization cannot be completed, analysis fails with a non-zero exit code without emitting a manifest.

### `dependency-graph.json`

Use dependency-cruiser's official `ICruiseResult` JSON as the canonical relationship exchange format. Graph scope represents local project files without npm packages or Node built-ins contaminating local-file metrics.

### `complexity-metrics.json`

Use a path-keyed map for per-file `complexity`, `loc`, `instability`, `fanIn`, and `fanOut`. Each supported TypeScript implementation file distinguishes measured complexity from skipped, ignored, stale, or fatally unmeasured ESLint results.

### `complexity-report.md`

The human-facing report contains health information, hotspots, threshold violations, measurement coverage, and baseline deltas.

### Measurement completeness

`maritime validate` confirms that an artifact bundle is structurally valid; it does not require every selected implementation file to have a complexity measurement. For authoritative CI evidence and refactoring gates, run analysis with `--fail-on-unmeasured`:

```bash
maritime analyze --source src --output .maritime --fail-on-unmeasured
maritime validate .maritime
```

This makes analysis fail when a selected supported TypeScript implementation file is skipped, ignored, stale, or has a fatal ESLint parsing/configuration error.

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
    "skippedCount": 0,
    "architectureDebt": {
      "baselineCount": 5,
      "existingDebtCount": 5,
      "newViolationCount": 0,
      "resolvedCount": 0
    },
    "changeImpact": {
      "baseRevision": "origin/main",
      "directlyChangedCount": 3,
      "gitChangedCount": 10,
      "directlyChangedGraphCount": 3,
      "transitiveImpactCount": 12,
      "affectedFolderCount": 4,
      "impactRatio": 0.2857
    },
    "architecture": {
      "namespaces": [
        {
          "folder": "src/features/visualization",
          "moduleCount": 12,
          "afferentCoupling": 4,
          "efferentCoupling": 6,
          "instability": 0.6
        }
      ]
    }
  }
}
```

`directlyChangedCount` is the schema `1.0.0` compatibility name for directly changed graph modules. New producers also emit `directlyChangedGraphCount` with the same value and optionally report `gitChangedCount` for all files changed in Git; consumers must continue accepting manifests that contain only the compatibility field (`directlyChangedCount`).

## Validation contract

The `maritime validate` command validates a Maritime artifact output directory without executing repository analysis or importing UI dependencies:

```bash
maritime validate .maritime
```

It verifies:
1. `manifest.json` exists and validates against `ArtifactManifestSchema` matching supported `schemaVersion` (`1.0.0`).
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

Pull requests affecting the contract execute `.github/workflows/cli-contract.yml`. On `main`, CI calls that same workflow as a release gate. Triggers include changes to `src/cli/**`, `src/schema/**`, `tests/cli-pack-smoke.test.ts`, `package.json`, `package-lock.json`, `tsconfig.cli.json`, or `.github/workflows/**`.

Documentation-only PRs (modifying strictly `docs/**` or `*.md`) intentionally bypass the compatibility matrix.

### Required execution contract

The reusable CLI contract workflow executes:
1. `npm run build:cli`
2. `npm run test:cli-package`

across the supported Node.js compatibility matrix (`22.13.0`, `24.x`). It also runs the composite-action graph render smoke.

## Release requirements

A public release requires all of the following criteria to be satisfied:

1. A clean consumer can install the packed/published CLI without UI or browser dependencies.
2. The normal CLI analyzer can generate its own dependency graph or consume a caller-supplied graph file.
3. Representative external consumers pass end-to-end through the packed CLI outside the Maritime repository tree.
4. Local graph scoping and ESLint measurement integrity are enforced.
5. The required Node, ESLint, and dependency-cruiser runtime compatibility matrix passes in CI.

## GitHub Actions Integration

Dependency Maritime provides an official composite action (`action.yml`) that wraps `maritime analyze`, `maritime validate`, and optional graph rendering without importing React or UI dependencies.

### Action inputs

| Input | Description | Default |
| :--- | :--- | :--- |
| `cli-source` | Development override or published CLI version | `''` |
| `node-version` | Node.js version baseline | `'22.13.0'` |
| `source-roots` | Source roots, space/newline/comma separated | `'src'` |
| `depcruise-config` | Repository dependency-cruiser configuration | `''` |
| `output-dir` | Canonical Maritime artifact directory | `'.maritime'` |
| `fail-on-unmeasured` | Fail when a selected implementation file is unmeasured | `'true'` |
| `upload-artifact` | Upload the generated artifact directory | `'true'` |
| `artifact-name` | Workflow artifact name | `'maritime-artifacts'` |
| `render-graph` | Render the validated graph | `'false'` |
| `graph-output` | Derived SVG destination | `'docs/images/dependency-graph.svg'` |
| `graph-profile` | Named presentation preset profile | `''` |

Presentation inputs (e.g., `external-packages`, `folder-grouping`, `module-aggregation`, `layout-direction`, etc.) allow overriding specific profile settings. See [Graph Presentation Profiles](./GRAPH_PROFILES.md) for full profile definitions and presentation settings.

A normal released consumer workflow looks like:

```yaml
- uses: actions/checkout@v4
- name: Maritime Analyze & Validate
  uses: g1ddy/dependency-maritime@<released-action-ref>
  with:
    cli-source: '@dependency-maritime/cli@<matching-version>'
    source-roots: src
    render-graph: 'true'
    graph-profile: local-architecture
```

## Supported graph rendering

Render an SVG presentation directly from existing canonical evidence:

```bash
maritime graph --input .maritime --output docs/images/dependency-graph.svg
maritime graph --input .maritime --output architecture.svg --graph-profile compact-architecture
maritime graph --input .maritime --output overview.svg --graph-profile architecture-overview
```

For an artifact directory input, `maritime graph` validates the bundle and reads both the graph path and `sourceRoots` from `manifest.json`. Rendering never runs a second dependency analysis; JSON remains canonical evidence and SVG/DOT remains derived presentation.

For detailed documentation on graph presentation profiles (`default`, `local-architecture`, `compact-architecture`, `architecture-overview`) and individual presentation switches, see [Graph Presentation Profiles](./GRAPH_PROFILES.md).

SVG rendering requires Graphviz `dot` on `PATH`; Graphviz is not bundled in the npm package.

## Related documentation

- [Graph Presentation Profiles](./GRAPH_PROFILES.md) — Presentation preset profiles and override semantics.
- [Architecture](./ARCHITECTURE.md) — Headless analyzer versus UI boundaries.
- [Complexity and Health Metrics](./COMPLEXITY.md) — Metric definitions and repository evidence.
- [Development Guide](./DEVELOPMENT.md) — Local setup and verification.
- [Product Roadmap](./ROADMAP.md) — Future delivery intent.
