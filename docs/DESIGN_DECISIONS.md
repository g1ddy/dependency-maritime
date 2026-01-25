# Design Decisions & Concerns

## Repository Structure
**Decision:** Use a simple root-based structure for the MVP.
*   **Rationale:** Keeps the initial setup simple. The CLI logic can reside in a `src/cli` directory or scripts, while the main React app lives in `src/`.
*   **Future:** Can be migrated to a monorepo (NX or Turborepo) if the CLI and UI packages diverge significantly.

## Data Ingestion Strategy
**Current Plan:** CLI watches files -> runs `dep-cruiser` -> writes `cruiser-output.json` -> App reads JSON.
*   **Concern:** For Phase 1, we might just load a static JSON file.
*   **Decision:** The UI will expect a JSON object matching the schema. Whether it comes from a static file or a dev-server endpoint is an implementation detail we can refine.

## Layout Algorithms
**Decision:** Use Dagre (via `@reactflow/dagre` or direct) for initial hierarchical layout.
*   **Concern:** Dagre can be slow for very large graphs and doesn't always produce the most compact layouts.
*   **Mitigation:** Explore ElkJS or other layout engines if Dagre proves insufficient in Phase 2.

## Performance
**Concern:** Large dependency graphs (thousands of nodes) can cause rendering lag in the DOM.
*   **Mitigation:**
    *   Use Zustand for state management to avoid prop-drilling and unnecessary re-renders.
    *   React Flow handles virtualization well, but we must be careful with custom node complexity.
    *   Graphology operations should happen outside the main render loop (possibly in a Web Worker if needed later).

## Development Workflow

**Decision:** "Test-First" Development.
*   **Strategy:** Write logic tests (Graphology, Zod validation) before UI components.
*   **Tooling:** Vitest for unit testing.

**Decision:** Component Scaffolding.
*   **Strategy:** Build Shadcn/UI components and Custom React Flow nodes in isolation.
