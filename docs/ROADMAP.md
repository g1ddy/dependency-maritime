# Project Roadmap

This document contains work that is still outstanding. Current behavior and supported contracts belong in the documents linked below; do not duplicate completed implementation checklists here.

## Delivered foundations

- [Architecture](./ARCHITECTURE.md): headless graph logic, shared schemas, Zustand state, Graphology transformation, React Flow rendering, and Dagre/ELK layout.
- [CLI and Artifact Contract](./CLI.md): the packaged analyzer, generated .maritime artifact directory, validation command, consumer configuration, and supported runtime contract.
- [Complexity and Health Metrics](./COMPLEXITY.md): authoritative repository metric evidence and definitions.
- [README](../README.md): the implemented interactive graph, node inspection, upload, and visualization controls.

## UI roadmap

### Complete core Inspector; add analysis tools

The core inspector is implemented: it shows a selected node's path, metrics, dependencies, and dependents, and supports navigation between them.

- [ ] Add a shortest-path tool for two selected nodes.
- [ ] Add impact analysis that reports the affected portion of the graph.

### Export and presentation

- [ ] Export the current graph visualization as PNG or SVG.
- [ ] Offer a user-facing health-report export/download.

### Optional layout scaling

Dagre and ELK layouts are implemented.

- [ ] Evaluate and, if justified, add a force/compact layout for large graphs.

## Refactoring simulator

A simulation foundation exists: the store maintains an original graph, supports node reparenting, and can reset the draft state.

- [ ] Validate simulated moves for cycles and documented architectural rules without blocking exploration.
- [ ] Clearly mark simulated violations in the graph.
- [ ] Produce a refactoring manifest from original versus simulated paths.
- [ ] Recalculate and display metric deltas after a simulated move.
- [ ] Add undo/redo for a simulation session.

## Cohesion assistant

- [ ] Detect logical communities from coupling/cohesion data.
- [ ] Show drift between physical structure and those communities.
- [ ] Turn findings into concrete, reviewable refactoring suggestions.
- [ ] Export manual and suggested plans as Markdown checklists and optional shell/PowerShell scripts.

## CLI and artifact delivery

These are the unfinished delivery items previously tracked in [CLI.md](./CLI.md).

### Consumer confidence

- [x] Validate the packed CLI against at least two additional ESLint 9+ flat-config TypeScript frontend repositories (Catan Hex Mastery and Crawler Command Interface).

### Artifact archive and UI bundle upload

- [ ] Define a standard archive form for a validated .maritime directory without coupling archive creation to normal analysis.
- [ ] Preserve raw graph upload and add complete .zip bundle upload to the UI.

### Baseline comparison and regression policy

- [ ] Add maritime compare --baseline with absolute and percentage deltas.
- [ ] Add configurable regression-policy gates.
- [ ] Support checked-in and downloaded CI baselines.
- [ ] Demonstrate before/after refactoring evidence in real pull requests.

### CI adapter and public release

- [x] Add a reusable GitHub Actions workflow / composite action built on the packed/published CLI artifact contract.
- [ ] Remove the private/pre-release package state when release criteria are satisfied.
- [ ] Publish with semantic versioning, provenance, changelog/release automation, and a compatibility policy.

### ESLint 10 compatibility

- [ ] Upgrade and validate ESLint 10 through the distributed integration suite.

## Documentation consolidation

- [ ] Keep the README's user-facing CLI and upload guidance aligned with the supported maritime analyze and artifact workflow.
- [ ] Replace historical coverage snapshots in [Quality](./QUALITY.md) with current test strategy, evidence, and prioritized gaps.
