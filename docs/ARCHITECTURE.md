# Architecture

Dependency Maritime has two deliberately separate product surfaces:

- a headless Node CLI that analyzes a repository and writes validated `.maritime` evidence;
- a React UI that visualizes validated dependency graphs and metrics.

The CLI is the reusable product. The UI is an adapter for inspecting the same contract. Keep those
surfaces independently buildable and independently understandable.

## System flow

~~~mermaid
flowchart TD
  Source["Consumer source"] --> Analyzer["Dependency-Cruiser + ESLint"]
  Config["Consumer dependency-cruiser config"] --> Analyzer
  Analyzer --> Normalize["Maritime validation + normalization"]
  Normalize --> Artifact["Canonical .maritime evidence"]
  Artifact --> Interpret["Debt, impact, coupling, hotspots"]
  Interpret --> Report["Manifest + Markdown report"]
  Artifact --> UI["React visualizer"]
  Artifact --> Graph["Derived graph presentations"]
~~~

The important boundary is **analyzer evidence → Maritime normalization → Maritime interpretation → presentation**.
Do not reshape raw analyzer output to match today's UI. Validate and normalize it into Maritime-owned contracts first,
then derive reports, architecture analysis, and visualizations from those contracts.

A caller-supplied Dependency-Cruiser graph follows the same path as a generated graph. Maritime validates and
normalizes it, then serializes the normalized graph into the artifact bundle. Raw upstream bytes are never copied into
canonical `.maritime` evidence, and the caller's original input file is never modified.

## Conceptual architecture versus generated architecture

Hand-authored architecture documentation and generated Maritime evidence answer different questions:

- this document explains **why responsibilities and boundaries exist**;
- generated `.maritime` evidence explains **what the repository currently depends on**;
- derived SVG/DOT presentations explain **how that current evidence is rendered for a particular audience**.

Generated structure is evidence, not architectural intent. Hand-authored intent is not proof that the current code still
follows it. Keep both and use divergence between them as a review signal.

## Dependency direction

Dependencies flow toward shared contracts and lower-level utilities.

| Layer | Locations | May depend on | Must not depend on |
| --- | --- | --- | --- |
| Bootstrap | `src/main.tsx`, `src/App.tsx` | components, features, schemas | CLI internals |
| CLI product | `src/cli/` | `src/schema` and CLI-local modules | React, Vite, browser APIs, features, UI components |
| Shared contracts | `src/schema/` | Zod and TypeScript-only dependencies | CLI commands, UI, feature stores, browser APIs |
| Feature slice | `src/features/<feature>/` | schemas, lib, shared components, its own modules | another feature's internals, CLI |
| Shared UI | `src/components/` | lib, schemas, UI primitives | feature stores or feature-specific logic |
| UI primitives | `src/components/ui/` | styling and primitive dependencies | features, application state, CLI |
| General utilities | `src/lib/` | small platform-neutral dependencies | React components, stores, features, CLI commands |

The bootstrap layer composes features; it does not own feature logic. A feature may use a shared
contract, but a shared contract must never import a feature.

## Namespaces and file placement

Use the narrowest namespace that owns a concept:

- `src/schema/`: a contract crossing the CLI/UI boundary, or an input/output format validated at
  runtime. Export its TypeScript type beside its Zod validation boundary.
- `src/cli/`: public commands, artifact validation, CLI-only analysis and adapters. Keep `main.ts` as
  process startup, `index.ts` as the programmatic export surface, `commands/` as command orchestration,
  and `analyze/` or `validate/` as command-private implementation.
- `src/features/<feature>/components/`: React components specific to that vertical feature.
- `src/features/<feature>/logic/`: pure transformations, layout, metrics, filtering, and workers.
  These modules must be independently testable without rendering React.
- `src/features/<feature>/store.ts`: feature state and coordination. Do not put general algorithms
  or reusable UI components in a store.
- `src/features/<feature>/types.ts`: types private to that feature. Promote a type to `src/schema/`
  only when it crosses a product boundary.
- `src/components/ui/`: generic presentation primitives with no Maritime feature knowledge.
- `src/components/`: shared application components that are used by multiple features but are not
  generic primitives.
- `src/lib/`: framework-independent helpers with no feature ownership.

Do not import one feature's store, components, or logic from another feature. Extract genuinely
shared code into schema, components, or lib according to its responsibility instead.

## Feature boundaries

### CLI

The CLI owns source discovery, Dependency-Cruiser integration, ESLint complexity measurement,
artifact creation, architecture-debt comparison, change-impact traversal, coupling aggregation,
and artifact validation. It consumes shared schemas and must remain runnable from a clean consumer
installation without the UI dependency graph.

CLI command modules should orchestrate rather than accumulate analysis algorithms. Put reusable or independently
testable analysis in `src/cli/analyze/` and keep `src/cli/commands/` focused on argument validation, sequencing, and
exit-code behavior.

### Visualization

The visualization feature owns graph-to-React-Flow transformation, layout, filtering, interaction,
and inspection. Graphology and layout algorithms belong in `logic/`, while React rendering belongs in
`components/` and state coordination belongs in `store.ts`.

### Relationships

The relationships feature is a separate visualization slice. Keep it independent of the
dependency-analysis pipeline and avoid coupling its internal store or components to the
visualization feature.

## Architecture analysis contracts

### Architecture debt

Baseline creation and enforcement are intentionally separate operations:

- `--write-baseline <file>` establishes the current known debt;
- `--baseline <file> --fail-on-new-violations` compares current evidence with an existing baseline and may gate CI.

The CLI rejects attempts to combine baseline creation with baseline comparison or enforcement so a current run cannot
overwrite the evidence it is supposed to compare against.

### Change impact

`--base <revision>` computes a Git diff and then intersects it with the dependency graph. Maritime keeps these concepts
separate:

- Git-changed files are the files Git reports as changed;
- directly changed graph modules are changed files represented in the dependency graph;
- transitively affected modules are dependents reachable from those graph modules;
- impact ratio is the affected graph-module count divided by total graph modules.

A Git failure is an analysis error, never an implicit zero-impact result.

### Namespace coupling

Namespace metrics are normalized Maritime interpretation over the dependency graph. They report module count,
afferent coupling, efferent coupling, and instability. Namespace aggregation is a reporting model and must not mutate
or weaken the consumer-owned Dependency-Cruiser policy.

## Evidence and repository policy

- `config/.dependency-cruiser.cjs` is Maritime's dogfooding policy, not a consumer default.
- `.maritime/` is the canonical repository evidence bundle.
- raw analyzer-only fields that Maritime does not own are stripped during normalization rather than silently becoming
  part of the public artifact contract.
- the Project Graph, Markdown report, and derived SVG graph presentation (`docs/images/dependency-graph.svg`) must derive
  from that one bundle.
- generated evidence and images are outputs: regenerate them through the documented workflow, not by hand.
- presentation profiles never mutate canonical evidence.

## Architecture change checklist

Before moving code or adding a namespace:

1. Identify the owning layer and allowed dependencies in this document.
2. Preserve the CLI/UI boundary and shared-schema direction.
3. Preserve the analyzer → normalized evidence → interpretation → presentation boundary.
4. Keep pure logic out of React rendering, feature state, and command orchestration.
5. Add or move focused tests with the code they protect.
6. Update this document only when a stable boundary or ownership rule changes.

For public CLI behavior, use [CLI](./CLI.md). For repository verification and documentation
ownership, use [Development](./DEVELOPMENT.md).
