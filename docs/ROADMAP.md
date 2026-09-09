# Project Roadmap

This document outlines future product intent, architectural enhancements, and deliberate deferrals. Current behavior and supported contracts belong in the authoritative documents linked below.

## Delivered Foundations

* [Architecture](./ARCHITECTURE.md) — Headless CLI analyzer, shared Zod schemas, Zustand store, Graphology metrics, React Flow rendering, and Dagre/ELK layout engines.
* [CLI & Artifact Contract](./CLI.md) — Packaged analyzer (`@dependency-maritime/cli`), `.maritime` artifact bundle, validation command, composite GitHub Action, baseline comparison, and PR change impact analysis.
* [Graph Presentation Profiles](./GRAPH_PROFILES.md) — Named presets (`default`, `local-architecture`, `compact-architecture`, `architecture-overview`) and presentation override switches.
* [Code Complexity & Health Metrics](./COMPLEXITY.md) — Metric definitions, thresholds, compound health score formulas, and canonical repository evidence.
* [Development Guide](./DEVELOPMENT.md) — Contributor environment setup, verification matrix, and documentation ownership.

---

## Active & Future Intent

### Architecture Analysis Parity & Analyzer Refactoring
- **Dependency-Cruiser 18 Parity:** Maintain parity with Dependency-Cruiser 18 rule engine, architecture debt evaluation, and external package grouping behaviors.
- **CLI Analyzer Orchestration Decomposition:** Keep CLI command orchestration modular and maintainable, separating graph input resolution, architecture analysis, and artifact manifest assembly.

### Richer Code Health & Dead-Code Metrics
- **Knip / Unused Code Integration:** Integrate unused file, export, and dependency detection into Maritime metrics and hotspot reports.
- **Advanced Coupling Metrics:** Expand architectural namespace metrics (e.g., distance from main sequence, abstractness vs. instability).

### UI Inspector & Visualization Capabilities
- **Shortest Path Analysis:** Add a path-finding tool between two selected graph nodes in the Inspector panel.
- **Sub-Graph Impact Highlighting:** Visually highlight downstream impact paths when inspecting a selected node or folder.
- **Graph & Health Export:** Support exporting current graph layouts as standalone SVG/PNG files and downloading structured health summaries from the UI.
- **Force / Compact Layout Option:** Evaluate force-directed layout algorithms for high-density, multi-thousand-node graphs.

### Interactive Refactoring Simulator
- **Cycle & Constraint Validation:** Validate simulated node/folder reparenting against architectural rules without blocking visual exploration.
- **Metric Delta Preview:** Dynamically calculate and display LOC, complexity, and coupling score deltas after simulated refactoring moves.
- **Refactoring Plan Export:** Export simulated structural changes as Markdown refactoring checklists or migration scripts.
- **Undo / Redo State:** Add history tracking for simulation sessions.

### Cohesion Assistant
- **Community Detection:** Identify logical module clusters from coupling and cohesion patterns using graph algorithms.
- **Structural Drift Analysis:** Highlight discrepancies between physical folder layout and cohesive logical clusters.
- **Refactoring Suggestions:** Generate actionable, reviewable structural recommendations.

### CLI Distribution & Artifact Enhancements
- **Artifact Bundle Packaging:** Define a standardized `.zip` archive format for `.maritime` output directories for browser upload and CI artifact persistence.
- **Complete ZIP Upload in UI:** Enable loading complete zipped `.maritime` artifact bundles directly in the UI.
- **ESLint 10 Compatibility:** Upgrade and verify ESLint 10 flat configuration support across distributed CLI test suites.
- **Package Distribution & Provenance:** Maintain automated npm publishing with provenance, semantic versioning, and changelog generation.
