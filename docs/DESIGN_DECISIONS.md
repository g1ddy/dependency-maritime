# Architectural & Design Decision Records (ADRs)

This document records the key durable architectural decisions made in Dependency Maritime, along with their status, context, and rationale.

---

### ADR-001: Headless CLI & Interactive React UI Boundary Separation

* **Status:** Accepted
* **Context:** Maritime needs to support both automated headless CI environments (where Node CLI scripts generate dependency evidence) and interactive browser-based visualization (where developers inspect graphs).
* **Decision:** Keep the CLI package (`@dependency-maritime/cli` in `src/cli/`) strictly separated from the React UI (`src/features/visualization/` and `src/components/`). The CLI is a self-contained Node package with zero React, DOM, or browser dependencies.
* **Consequences:** The CLI can run in lightweight headless CI runners or clean consumer repositories without UI overhead. The UI acts as a client that ingests validated evidence produced by the CLI. Shared Zod schemas (`src/schema/`) serve as the sole contract between the two surfaces.

---

### ADR-002: `.maritime/` Artifact Bundle as Canonical Evidence Source

* **Status:** Accepted
* **Context:** Earlier design plans considered temporary JSON output files (`cruiser-output.json`) or dev-server API endpoints for transferring graph data.
* **Decision:** Adopt a versioned, self-contained artifact directory (`.maritime/` by default) as the sole canonical evidence output. It contains `dependency-graph.json` (dependency-cruiser `ICruiseResult`), `complexity-metrics.json`, `complexity-report.md`, and `manifest.json`.
* **Consequences:** All downstream consumers (UI inspector, GitHub Action, Markdown report, derived SVG presentations) derive their data from this single validated bundle without rescanning or modifying source files.

---

### ADR-003: Hierarchical Graph Layout Strategy (Dagre & ELK)

* **Status:** Accepted
* **Context:** Complex dependency graphs require clear hierarchical representation. Early planning considered starting with Dagre and evaluating ElkJS later if Dagre proved insufficient.
* **Decision:** Support both Dagre (default fast hierarchical layout) and ELK (Eclipse Layout Kernel via `elkjs` for complex compound/nested folder graph layouts) directly within the visualization store.
* **Consequences:** Users can switch layout engines in the UI based on graph size and structure. Dagre layout calculation is offloaded to a Web Worker to prevent UI thread blocking on large graphs, while ELK layout executes asynchronously.

---

### ADR-004: Performance & State Management Strategy (Zustand & Graphology)

* **Status:** Accepted
* **Context:** Large codebases contain thousands of nodes and edges. Passing graph state through React prop drilling or unoptimized context providers causes severe DOM re-render lag.
* **Decision:** Use Zustand for graph state coordination and Graphology for graph query and metric transformations outside the React render cycle.
* **Consequences:** Component re-renders are isolated through fine-grained Zustand selectors. Graph operations execute efficiently without React tree overhead.

---

### ADR-005: Package Management & Lockfile Policy

* **Status:** Accepted (Supersedes planned switch to pnpm)
* **Context:** An early roadmap entry considered migrating package management from `npm` to `pnpm`.
* **Decision:** Retain `npm` as the official repository package manager with `package-lock.json`. Delete `pnpm-lock.yaml` to ensure package manager policy consistency across local and CI environments.
* **Consequences:** Ensures consistency across CI workflows, developer documentation, and composite Action setup. The proposal to switch to `pnpm` is explicitly superseded to maintain repository stability.

---

### ADR-006: Local-First Processing & Privacy Policy

* **Status:** Accepted
* **Context:** Source code structure and internal dependency metrics are sensitive intellectual property.
* **Decision:** Perform all analysis and rendering locally on the user's machine or within their private CI runner. No source code, ASTs, metrics, or telemetry are transmitted to any external Maritime-hosted service.
* **Consequences:** Privacy and security are preserved by default. Note that CI workflows executing Maritime may be configured to upload generated `.maritime` evidence artifacts to the repository's host platform (e.g. GitHub Actions artifacts) according to caller workflow rules.

---

## Related Documentation

* [Architecture](./ARCHITECTURE.md) — System flow, layer rules, and dependency direction.
* [CLI & Artifact Contract](./CLI.md) — Public CLI commands, manifest schema, and artifact specs.
* [Development Guide](./DEVELOPMENT.md) — Contributor guide and documentation ownership.
