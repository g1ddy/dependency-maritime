# Quality & Test Strategy

Dependency Maritime uses a layered verification strategy to ensure reliability across both its headless CLI package and interactive React UI application. This document defines the testing layers, verification expectations, canonical commands, and guidelines for identifying quality gaps without relying on static coverage snapshots in prose.

## Verification Layers

### 1. Unit & Logic Tests
* **Purpose:** Validate pure functions, Graphology graph transformations, metric calculations, layout algorithms, filtering rules, and Zod schema parsing in isolation.
* **Scope:** `src/**/*.test.ts`, `src/features/**/logic/*.test.ts`, `src/schema/*.test.ts`.
* **Execution:** Executed via Vitest (`npm test` / `npx vitest run`).

### 2. UI Component & State Integration Tests
* **Purpose:** Verify React component rendering, user interactions, Zustand store state transitions, data dialog parsing, and error handling without full browser overhead.
* **Scope:** `src/components/**/*.test.tsx`, `src/features/**/*.test.tsx`, `src/features/**/store.test.ts`.
* **Execution:** Executed via Vitest with JSDOM environment (`npm test`).

### 3. CLI Package & Packed Consumer Tests
* **Purpose:** Prove that `@dependency-maritime/cli` is self-contained and functions correctly when built and published. Ensures no UI or browser dependencies pollute the CLI runtime.
* **Scope:** `src/cli/**/*.test.ts`, `tests/cli-pack-smoke.test.ts`, `tests/runtime-contract.test.ts`.
* **Execution:** `npm run build:cli && npm run test:cli-package`. Packed smoke tests test analysis, validation, fallback configuration, multi-root inputs, and Graphviz rendering against isolated consumer fixtures.

### 4. Workflow & Evidence Contract Checks
* **Purpose:** Guarantee that repository workflows, composite GitHub Action steps, and canonical `.maritime` evidence generation behave reproducibly across supported Node.js versions (`22.13.0` and `24.x`).
* **Scope:** `tests/evidence-workflow.test.ts`, `tests/action-ref-resolution.test.ts`, `.github/workflows/cli-contract.yml`.
* **Execution:** `.github/workflows/cli-contract.yml` in CI, or locally via `npm run test:cli-package`.

### 5. End-to-End (E2E) & Visual Verification
* **Purpose:** Validate full end-to-end user workflows in real browser environments, including file upload, graph interaction, layout switching, and inspector rendering.
* **Scope:** `tests/e2e/*.spec.ts`, Playwright configuration.
* **Execution:** `npm run test:e2e` (requires built application or Vite server).

## Canonical Verification Commands

| Command | Purpose | When to Run |
| :--- | :--- | :--- |
| `npm run lint` | ESLint static code analysis | Before every commit / PR |
| `npm test` | Run all Vitest unit, logic, and component tests | During active development |
| `npm run build:cli` | Bundle CLI binaries (`main.js`, `index.js`) and generate d.ts | Before CLI testing |
| `npm run test:cli-package` | Run packed CLI and runtime contract integration tests | When touching `src/cli/`, `src/schema/`, or Action code |
| `npm run build` | Full production build (CLI + TypeScript check + Vite) | Handoff before PR submission |
| `npm run test:e2e` | Run Playwright browser end-to-end suite | Frontend/UI changes affecting user flows |

## Test Expectations & Guidelines

* **CLI Isolation Invariant:** The CLI package must never import React, Vite, DOM APIs, or UI components. Packed smoke tests enforce this boundary.
* **Deterministic Logic:** Graph algorithms, layout engines, and metric calculations must remain pure, side-effect-free, and independently testable without React rendering.
* **Schema Validation:** All graph JSON inputs, metrics maps, and artifact manifests must be validated with shared Zod schemas at system boundaries (CLI file loading, UI upload).
* **Async & Event Test Hygiene:** UI and store tests must await state rehydration or async worker execution explicitly rather than using arbitrary time-based waits.

## Identifying & Prioritizing Quality Gaps

Rather than recording static line-coverage percentages in documentation (which become stale quickly), developers should identify test coverage gaps using executable tooling:

1. **Generate Coverage Report:**
   ```bash
   npx vitest run --coverage
   ```
2. **Review Hotspots:** Inspect generated HTML reports in `coverage/` or terminal summary metrics for low-coverage modules.
3. **Prioritize Gaps by Risk:**
   * **High Risk (Critical Path):** Public CLI entry points, artifact schema parsing, graph transformation logic, and Zustand store actions.
   * **Medium Risk:** UI dialogs, visual node rendering, complex filter combinations.
   * **Low Risk:** Presentation primitives and boilerplate setup.

## Related Documentation

* [Development Guide](./DEVELOPMENT.md) — Contributor setup, workflow, and documentation ownership.
* [CLI & Artifact Contract](./CLI.md) — CLI requirements and contract validation.
* [Architecture](./ARCHITECTURE.md) — System boundaries and dependency direction rules.
