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

Pull requests that affect the contract execute the dedicated `.github/workflows/cli-contract.yml`
workflow directly. On `main`, general CI calls that same workflow as a reusable release gate, so a
release tag cannot be created until the compatibility matrix and render smoke both pass. Pull request
contract checks are triggered whenever any of the following paths are modified:

- `src/cli/**`
- `src/schema/**`
- `tests/cli-pack-smoke.test.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.cli.json`
- `.github/workflows/**`

Documentation-only PRs (modifying strictly `docs/**` or `*.md`) intentionally bypass the full 3-node compatibility matrix to avoid unnecessary build queues, while any pull request modifying CLI, schema, test, configuration, or workflow files is guaranteed to execute the contract checks.

### Required execution contract

The reusable CLI contract workflow executes:

1. `npm run build:cli`
2. `npm run test:cli-package`

across the supported Node.js compatibility matrix (`20.19.0`, `22.x`, `24.x`) with `fail-fast: false`.
It also runs the composite-action graph render smoke. Direct pull-request execution preserves the
`CLI Contract Checks` workflow and job names used by required-check branch protection.

## Release requirements

A public release requires all of the following:

1. A clean consumer can install the packed/published CLI without UI dependencies.
2. The normal CLI path can generate its own dependency graph or deliberately consume a supplied one.
3. Representative external consumers pass end-to-end through the packed CLI outside the Maritime repository tree.
4. Local graph scoping and measurement integrity are enforced.
5. The required Node, ESLint, and dependency-cruiser runtime compatibility matrix passes.

## GitHub Actions Integration

Dependency Maritime provides an official composite action (`action.yml`) that wraps `maritime analyze`, `maritime validate`, and optional graph rendering without importing React or UI dependencies.

### Action inputs

| Input | Description | Default |
| :--- | :--- | :--- |
| `cli-source` | Optional development override such as a packed CLI tarball or exact package version | `''` |
| `node-version` | Node.js version baseline | `'20.19.0'` |
| `source-roots` | One or more source roots, space/newline/comma separated | `'src'` |
| `depcruise-config` | Optional repository dependency-cruiser configuration | `''` |
| `output-dir` | Canonical Maritime artifact directory | `'.maritime'` |
| `fail-on-unmeasured` | Fail when a selected implementation file is unmeasured | `'true'` |
| `upload-artifact` | Upload the generated artifact directory | `'true'` |
| `artifact-name` | Workflow artifact name | `'maritime-artifacts'` |
| `render-graph` | Render the validated graph | `'false'` |
| `graph-output` | Derived SVG destination | `'docs/images/dependency-graph.svg'` |
| `graph-profile` | `default`, `local-architecture`, `compact-architecture`, or `architecture-overview` | `''` (CLI default when omitted) |
| `external-packages` | `none`, `summary`, or `direct` | `''` |
| `folder-grouping` | `none`, `top-level`, or `nested` | `''` |
| `module-aggregation` | `none` or `folders` | `''` |
| `aggregation-depth` | Positive folder depth below each configured source root | `''` |
| `edge-labels` | `none` or `types` | `''` |
| `layout-direction` | `lr` or `tb` | `''` |
| `rank-constraints` | `all` or `intra-folder` | `''` |
| `layout-density` | `normal` or `compact` | `''` |
| `visual-theme` | `standard` or `architecture` | `''` |
| `source-root-grouping` | `preserve` or `elide-single` | `''` |
| `edge-presentation` | `relations` or `semantic-pairs` | `''` |
| `cluster-ranking` | `global` or `local` | `''` |

Empty presentation inputs are intentionally not passed to the CLI. A selected profile supplies the baseline, and explicit inputs override that profile one setting at a time.

### Dogfood versus released consumers

The repository dogfood workflow and a released consumer workflow prove different things:

| Context | Action source | CLI source | Purpose |
| :--- | :--- | :--- | :--- |
| Maritime PR dogfood | checked-out `uses: ./` | `cli-source: '.'` after build | Tests the exact unmerged implementation. |
| Released external consumer | immutable released Action ref | matching `@dependency-maritime/cli@X.Y.Z[-pre]` | Uses a reproducible published contract. |

`.github/workflows/update-maritime-evidence.yml` is the dogfood reference orchestration. It analyzes, validates, renders, uploads candidate evidence, and writes generated evidence only through the protected `generated-evidence-write` Environment.

A normal released consumer looks like:

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

The caller owns workflow triggers, source/configuration paths, branch protection, artifact retention, and write policy. The composite Action is the reusable analysis/render wrapper rather than a repository-specific orchestration policy.

### Repository presentation profiles

| Repository | Profile | Purpose |
| :--- | :--- | :--- |
| Crawler Command Interface | `default` | Detailed dependency inspection with external packages and dependency-kind labels. |
| Dependency Maritime | `local-architecture` | File-level local architecture without external-package or edge-label noise. |
| Catan Hex Mastery | `compact-architecture` | Dense file-level LR architecture retaining recursive namespace ownership and semantic edges. |

`architecture-overview` is intentionally different from compact: it changes information granularity by aggregating files into source-root-relative folder nodes. See [Graph Presentation Profiles](./GRAPH_PROFILES.md) for the complete preset matrix.

### Multiple source roots and custom configuration

```yaml
- uses: g1ddy/dependency-maritime@<pinned-ref>
  with:
    source-roots: 'src lib'
    depcruise-config: 'config/.dependency-cruiser.cjs'
    output-dir: '.maritime'
    fail-on-unmeasured: 'true'
```

`source-roots: '.'` is valid. The repository root is treated as a configured zero-segment root for presentation policies, so aggregation depth is counted from the repository root rather than applying the unknown-root fallback.

Explicit and discovered dependency-cruiser configurations are used as supplied. Maritime's portable fallback uses `tsPreCompilationDeps: 'specify'` so generated evidence can distinguish pre-compilation-only relationships without changing consumer-owned configuration.

## Supported graph rendering

Render a presentation directly from existing canonical evidence:

```bash
maritime graph --input .maritime --output docs/images/dependency-graph.svg
maritime graph --input .maritime --output architecture.svg \
  --graph-profile compact-architecture
maritime graph --input .maritime --output overview.svg \
  --graph-profile architecture-overview
```

For an artifact-directory input, `maritime graph` validates the bundle and reads both the graph path and `sourceRoots` from `manifest.json`. An explicit JSON input is also supported and may infer roots from dependency-cruiser metadata. Rendering never runs a second dependency analysis; JSON remains canonical evidence and SVG/DOT remains derived presentation.

Profiles are named presets over the same explicit settings:

| Profile | Granularity | Key presentation behavior |
| :--- | :--- | :--- |
| `default` | files + direct externals | nested folders, type labels, normal density, global cluster ranking |
| `local-architecture` | local files | no externals or edge labels; otherwise standard presentation |
| `compact-architecture` | local files | LR, compact `.10/.12` spacing, architecture theme, semantic-pair edges, sole-root elision, cluster-local ranking |
| `architecture-overview` | folders | source-root-relative folder aggregation at depth 2, architecture theme, semantic-pair edges |

The presentation switches compose independently after the profile baseline:

| CLI flag | Values | Effect |
| :--- | :--- | :--- |
| `--external-packages` | `none`, `summary`, `direct` | External package presentation. |
| `--folder-grouping` | `none`, `top-level`, `nested` | File namespace clustering. |
| `--module-aggregation` | `none`, `folders` | Keep file nodes or intentionally summarize them into folder nodes. |
| `--aggregation-depth` | positive integer | Folder depth below each configured source root when aggregation is enabled. |
| `--edge-labels` | `none`, `types` | Dependency-type text. |
| `--layout-direction` | `lr`, `tb` | Graph rank direction. |
| `--rank-constraints` | `all`, `intra-folder` | Which local edges influence rank placement. |
| `--layout-density` | `normal`, `compact` | Normal or compact node/rank separation. |
| `--visual-theme` | `standard`, `architecture` | Standard or reference-like semantic node/cluster styling. |
| `--source-root-grouping` | `preserve`, `elide-single` | Preserve root namespaces or remove one redundant sole-root wrapper. |
| `--edge-presentation` | `relations`, `semantic-pairs` | Raw relationships or one semantic edge per endpoint pair. |
| `--cluster-ranking` | `global`, `local` | Graphviz global (`newrank=true`) or cluster-local ranking. |

With `module-aggregation=folders`, aggregation depth is relative to configured source roots. With `source-roots: src`, depth `2` maps `src/features/board/components/GameHex.tsx` to `src/features/board`. With `source-roots: .`, the same depth maps `features/board/components/GameHex.tsx` to `features/board`.

Under `semantic-pairs`, duplicate source/target relationships combine. Runtime evidence wins over type/pre-compilation-only evidence when both are present; a pair is secondary/dashed only when every underlying relationship is non-runtime.

SVG rendering requires Graphviz `dot` on `PATH`; Graphviz is not bundled in the npm package. The supported reproducible Action path is `ubuntu-latest`, where Maritime requests Graphviz `2.42.2-9ubuntu0.1`. The CLI contract smoke exercises the actual `compact-architecture` profile on this pinned path because compact intentionally uses cluster-local ranking.

## Release and verification

The prerelease workflow is tag-driven. A `cli-vX.Y.Z[-pre]` tag is the release-version authority; the publish workflow stamps that version in its ephemeral workspace, builds and tests the packed package, publishes with npm provenance, then exercises the released Action/package pair from a clean consumer.

The authoritative PR/main contract proof is `.github/workflows/cli-contract.yml`: it runs the packed CLI consumer matrix on Node 20.19, 22, and 24 plus the composite Action compact-render smoke. Real consumer cutover remains repository-owned so Catan, Crawler, and Maritime can retain their own triggers and evidence/write policies.

## Related documentation

- [Graph Presentation Profiles](./GRAPH_PROFILES.md) — profile matrix and presentation-setting semantics.
- [Roadmap](./ROADMAP.md) — unfinished CLI delivery and UI work.
- [Architecture](./ARCHITECTURE.md) — headless analyzer versus UI boundaries.
- [Complexity and Health Metrics](./COMPLEXITY.md) — metric definitions and repository evidence.
- [Development Guide](./DEVELOPMENT.md) — local setup and verification.
