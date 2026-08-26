# Architecture

Dependency Maritime has two deliberately separate product surfaces:

- a headless Node CLI that analyzes a repository and writes validated .maritime evidence;
- a React UI that visualizes validated dependency graphs and metrics.

The CLI is the reusable product. The UI is an adapter for inspecting the same contract. Keep those
surfaces independently buildable and independently understandable.

## System flow

~~~mermaid
flowchart TD
  Source["Consumer source"] --> CLI["Maritime CLI"]
  Config["Consumer dependency-cruiser config"] --> CLI
  CLI --> Artifact["Validated .maritime artifacts"]
  Artifact --> UI["React visualizer"]
  Artifact --> Evidence["Markdown report and graph images"]
~~~

The CLI may generate an artifact directory itself or stage a caller-supplied graph into one. The UI
must validate uploaded data before it enters application state.

## Dependency direction

Dependencies flow toward shared contracts and lower-level utilities.

| Layer | Locations | May depend on | Must not depend on |
| --- | --- | --- | --- |
| Bootstrap | src/main.tsx, src/App.tsx | components, features, schemas | CLI internals |
| CLI product | src/cli/ | src/schema and CLI-local modules | React, Vite, browser APIs, features, UI components |
| Shared contracts | src/schema/ | Zod and TypeScript-only dependencies | CLI commands, UI, feature stores, browser APIs |
| Feature slice | src/features/<feature>/ | schemas, lib, shared components, its own modules | another feature's internals, CLI |
| Shared UI | src/components/ | lib, schemas, UI primitives | feature stores or feature-specific logic |
| UI primitives | src/components/ui/ | styling and primitive dependencies | features, application state, CLI |
| General utilities | src/lib/ | small platform-neutral dependencies | React components, stores, features, CLI commands |

The bootstrap layer composes features; it does not own feature logic. A feature may use a shared
contract, but a shared contract must never import a feature.

## Namespaces and file placement

Use the narrowest namespace that owns a concept:

- src/schema/: a contract crossing the CLI/UI boundary, or an input/output format validated at
  runtime. Export its inferred TypeScript type beside its Zod schema.
- src/cli/: public commands, artifact validation, CLI-only analysis and adapters. Keep main.ts as
  process startup, index.ts as the programmatic export surface, commands/ as command
  orchestration, and analyze/ or validate/ as command-private implementation.
- src/features/<feature>/components/: React components specific to that vertical feature.
- src/features/<feature>/logic/: pure transformations, layout, metrics, filtering, and workers.
  These modules must be independently testable without rendering React.
- src/features/<feature>/store.ts: feature state and coordination. Do not put general algorithms
  or reusable UI components in a store.
- src/features/<feature>/types.ts: types private to that feature. Promote a type to src/schema/
  only when it crosses a product boundary.
- src/components/ui/: generic presentation primitives with no Maritime feature knowledge.
- src/components/: shared application components that are used by multiple features but are not
  generic primitives.
- src/lib/: framework-independent helpers with no feature ownership.

Do not import one feature's store, components, or logic from another feature. Extract genuinely
shared code into schema, components, or lib according to its responsibility instead.

## Feature boundaries

### CLI

The CLI owns source discovery, dependency-cruiser integration, ESLint complexity measurement,
artifact creation, and artifact validation. It consumes shared schemas and must remain runnable
from a clean consumer installation without the UI dependency graph.

### Visualization

The visualization feature owns graph-to-React-Flow transformation, layout, filtering, interaction,
and inspection. Graphology and layout algorithms belong in logic/, while React rendering belongs in
components/ and state coordination belongs in store.ts.

### Relationships

The relationships feature is a separate visualization slice. Keep it independent of the
dependency-analysis pipeline and avoid coupling its internal store or components to the
visualization feature.

## Evidence and repository policy

- config/.dependency-cruiser.cjs is Maritime's dogfooding policy, not a consumer default.
- .maritime/ is the canonical repository evidence bundle.
- The Project Graph, Markdown report, DOT file, and graph images must derive from that one bundle.
- Generated evidence and images are outputs: regenerate them through the documented workflow, not
  by hand.

## Architecture change checklist

Before moving code or adding a namespace:

1. Identify the owning layer and allowed dependencies in this document.
2. Preserve the CLI/UI boundary and shared-schema direction.
3. Keep pure logic out of React rendering and feature state.
4. Add or move focused tests with the code they protect.
5. Update this document only when a stable boundary or ownership rule changes.

For public CLI behavior, use [CLI](./CLI.md). For repository verification and documentation
ownership, use [Development](./DEVELOPMENT.md).
