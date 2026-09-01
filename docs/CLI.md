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
| `external-packages` | External package presentation: `none`, `summary`, or `direct` | `'direct'` | No |
| `folder-grouping` | Local module clustering: `none`, `top-level`, or `nested` | `'nested'` | No |
| `edge-labels` | Dependency-type labels: `none` or `types` | `'types'` | No |

### Usage Examples

### Dogfood versus consumer

The repository dogfood workflow and a released consumer workflow prove different things and are not
interchangeable:

| Context | Action source | CLI source | Purpose |
| :--- | :--- | :--- | :--- |
| Maritime PR dogfood | Checked-out local `uses: ./` | `cli-source: '.'` after build | Tests the exact unmerged implementation. |
| Released external consumer | Immutable released Action ref | Matching published `@dependency-maritime/cli@X.Y.Z[-pre]` | Uses a publishable, reproducible contract. |

`.github/workflows/update-maritime-evidence.yml` is the dogfood reference orchestration. It builds
the checked-out PR CLI, analyzes and validates the canonical bundle, renders the derived SVG, and
uploads both as candidate evidence. Forks remain read-only. For a changed same-repository PR, its
write job targets the `generated-evidence-write` Environment and commits only generated evidence.
Maintainers must configure that Environment with a required reviewer. Leave **prevent self-review**
disabled when a solo maintainer must be able to approve their own run.

Released consumers must pin both halves of the public contract. A `cli-vX.Y.Z[-pre]` Action tag
resolves the matching exact published package, but an explicit `cli-source` makes that pairing
reviewable in the workflow. An unpublished Action SHA cannot make an unpublished checkout available
to an external consumer.

#### Normal consumer workflow

```yaml
name: Maritime evidence

on:
  pull_request:
    paths: ['src/**', 'package.json', 'package-lock.json']

permissions:
  contents: read

jobs:
  evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Maritime Analyze & Validate
        # Pin the full commit SHA associated with the cli-v0.1.0-beta.6 release.
        uses: g1ddy/dependency-maritime@<released-action-commit-sha>
        with:
          cli-source: '@dependency-maritime/cli@0.1.0-beta.6'
          source-roots: src
          graph-profile: local-architecture
          render-graph: 'true'
```

The caller owns its triggers, source and configuration paths, branch protection, artifact retention,
and any write or approval policy. The composite Action is only the reusable command wrapper; this
repository workflow should become reusable only after Catan and Crawler establish which orchestration
inputs are genuinely common.

#### Repository presentation profiles

Use the following repository mappings with the currently released renderer:

| Repository | Profile |
| :--- | :--- |
| Crawler Command Interface | `default` |
| Dependency Maritime | `local-architecture` |
| Catan Hex Mastery | `local-architecture` until folder aggregation ships in #265 |

Catan is the future wide, cross-folder reference for `compact-architecture`, but the current profile
only rearranges the same modules and edges. Until #265 delivers and releases real folder aggregation,
Catan should use the same clean `local-architecture` map as Maritime:

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Generate Catan Maritime evidence
    # Pin the full commit SHA associated with the cli-v0.1.0-beta.6 release.
    uses: g1ddy/dependency-maritime@<released-action-commit-sha>
    with:
      cli-source: '@dependency-maritime/cli@0.1.0-beta.6'
      source-roots: src
      render-graph: 'true'
      graph-output: 'docs/images/dependency-graph.svg'
      graph-profile: local-architecture
```

Presentation profiles affect only the derived SVG; they never change canonical
`.maritime/dependency-graph.json` evidence. After #265 is available in a matching Action and CLI
release, Catan can select `compact-architecture` to add real folder aggregation alongside its
top-to-bottom layout, released cross-folder rank constraints, and compact spacing.

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
      cli-source: './dependency-maritime-cli-0.1.0-beta.5.tgz'
```

The prerelease is published from the tag-triggered `Publish CLI prerelease` workflow. The
`cli-vX.Y.Z[-pre]` tag is the release-version authority; the workflow stamps that version into
`package.json` and `package-lock.json` only in its ephemeral release workspace, then builds,
exercises the packed-package contract, and publishes with npm provenance under the `prerelease`
distribution tag. For this feature, pushing `cli-v0.1.0-beta.5` therefore publishes beta.5. The workflow then
checks out the exact released tag and runs a clean external consumer job without `cli-source`, so
the tag-derived action resolution installs and exercises the just-published version while verifying
all four canonical `.maritime` artifacts and the rendered graph. The action selects the full
immutable CLI version rather than the distribution tag.

#### Verification Evidence and Consumer Cutover

The packed CLI has already been exercised against Catan Hex Mastery and Crawler Command Interface through their existing hand-rolled workflows. This PR adds the shared action contract and the release-time external consumer proof; it does not itself migrate those repositories to consume the action.

The authoritative PR and `main` contract proof is `.github/workflows/cli-contract.yml`: it runs the
Node 20.19, 22, and 24 packed-consumer matrix plus the composite-action render smoke. The authoritative
`cli-v*` release proof is `.github/workflows/publish-cli-prerelease.yml`: after publication, it invokes
the released action and package from a clean external consumer and validates the complete four-file
`.maritime` bundle and rendered graph. There is no separate manually dispatched consumer-smoke
workflow. Real-repository cutover remains a consumer-side follow-up so each repository can preserve
its own trigger, baseline-commit, dependency-cruiser, and Graphviz behavior.

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
maritime graph --input .maritime --output architecture.svg \
  --graph-profile compact-architecture
```

For an artifact-directory input, `maritime graph` validates the bundle and reads the graph path
declared by `manifest.json`; an explicit JSON input is also supported. It never runs
dependency-cruiser or a second structural scan. The JSON remains canonical machine-readable evidence, while SVG (or explicit
DOT debug output) is derived presentation and must not be hand-edited. The exported pure
`renderDependencyGraphToDot(graph)` function recursively derives directory clusters, preserves
unfamiliar local paths, collapses `node_modules` paths to package nodes, deterministically sorts all
output, and retains available dependency-kind, type-only, circular, and validity edge semantics.

Start with a named presentation profile. Profiles affect DOT/SVG only and never change or regenerate
the canonical `.maritime/dependency-graph.json` evidence.

| Profile | External packages | Folder grouping | Edge labels | Direction | Rank constraints | Density |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `default` | `direct` | `nested` | `types` | `lr` | `all` | `normal` |
| `local-architecture` | `none` | `nested` | `none` | `lr` | `all` | `normal` |
| `compact-architecture` | `none` | `nested` | `none` | `tb` | `intra-folder` | `compact` |

`default` preserves the renderer's prior policy. `local-architecture` is a clean local-source map;
`compact-architecture` is intended for wide, cross-folder graphs, but it currently rearranges the
same modules and edges. Catan should remain on `local-architecture` until #265's real folder
aggregation is released. Use an individual switch only when it deliberately overrides the selected
profile.

The presentation switches compose independently after the profile baseline:

| CLI flag | Values | Default | Effect |
| :--- | :--- | :--- | :--- |
| `--external-packages` | `none`, `summary`, `direct` | `direct` | Omits third-party nodes, emits one external-boundary node, or emits one node per directly imported package. Scoped and unscoped imports collapse to package names in `direct` mode. |
| `--folder-grouping` | `none`, `top-level`, `nested` | `nested` | Shows local modules flat, clusters only their first source-directory segment, or recursively derives directory clusters. |
| `--edge-labels` | `none`, `types` | `types` | Omits dependency-type text or preserves it. Circular, invalid, and type-only edge styling is independent. |
| `--layout-direction` | `lr`, `tb` | `lr` | Uses Graphviz left-to-right or top-to-bottom rank direction. |
| `--rank-constraints` | `all`, `intra-folder` | `all` | Lets every local dependency affect rank placement, or limits that effect to edges whose modules share the same top-level source folder. Cross-folder edges remain visible with `constraint=false`. |
| `--layout-density` | `normal`, `compact` | `normal` | Uses Graphviz's normal spacing or compact `ranksep=0.35` and `nodesep=0.2` spacing. |

For example, retain compact architecture defaults but restore left-to-right presentation:

```bash
maritime graph --input .maritime --output architecture.svg \
  --graph-profile compact-architecture --layout-direction lr
```

These policies affect only DOT/SVG presentation. They never modify
`.maritime/dependency-graph.json` or invoke dependency-cruiser, so the complete JSON remains the
canonical evidence. Omitting the profile and all overrides preserves the pre-beta.5 renderer policy exactly.

The three layout switches also affect only DOT/SVG presentation. `folder-grouping: nested` creates
recursive Graphviz cluster boxes for directories; it does not collapse file nodes into folder nodes.
`newrank=true` remains enabled for all layout policies because it avoids Graphviz 2.42 rank failures
with deeply nested clusters. Root-level modules are treated as belonging to the root (`.`) folder for
the `intra-folder` rank-constraint policy.

SVG rendering requires Graphviz `dot` on `PATH`; Graphviz is not bundled in the npm package. The CLI
reports an actionable error when it is missing. Maritime normalizes Graphviz's generator-version
comment, but byte-for-byte SVG stability still depends on keeping the Graphviz version fixed.

The composite action adds matching optional inputs:

| Input | Description | Default |
| :--- | :--- | :--- |
| `render-graph` | Render after successful analysis and validation | `'false'` |
| `graph-output` | Derived SVG destination | `'docs/images/dependency-graph.svg'` |
| `graph-profile` | `default`, `local-architecture`, or `compact-architecture` | CLI default (`'default'`) when omitted |
| `external-packages` | `none`, `summary`, or `direct` | CLI default (`'direct'`) when omitted |
| `folder-grouping` | `none`, `top-level`, or `nested` | CLI default (`'nested'`) when omitted |
| `edge-labels` | `none` or `types` | CLI default (`'types'`) when omitted |
| `layout-direction` | `lr` or `tb` | CLI default (`'lr'`) when omitted |
| `rank-constraints` | `all` or `intra-folder` | CLI default (`'all'`) when omitted |
| `layout-density` | `normal` or `compact` | CLI default (`'normal'`) when omitted |

```yaml
- uses: g1ddy/dependency-maritime@<pinned-ref>
  with:
    source-roots: 'app src'
    output-dir: '.maritime'
    render-graph: 'true'
    graph-output: 'docs/images/dependency-graph.svg'
    graph-profile: 'compact-architecture'
```

Individual presentation inputs remain available as advanced overrides. An explicit Action input wins
over the selected profile, for example `graph-profile: compact-architecture` with
`layout-direction: lr`. Empty Action inputs are not passed to the CLI, preserving compatibility
when an Action branch/commit falls back to an older published CLI.

Use `default` for Crawler Command Interface, `local-architecture` for Maritime, and
`local-architecture` for Catan Hex Mastery until #265's folder aggregation is released. At that
point Catan can move to `compact-architecture`. The local profiles remove third-party package
density and dependency-type text without repository-local renderers or package filters.

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
