# Agent Instructions

This repository contains the "Dependency Maritime" project.

## Core Directives

1.  **Read Context:** Before starting any task, read `.jules/context.md` to understand the domain boundaries, schemas, and architectural rules.
2.  **Consult Design Decisions:** Always check `docs/DESIGN_DECISIONS.md` to understand the rationale, concerns, and trade-offs before implementing features.
3.  **Follow Architecture:** Adhere to the architecture defined in `docs/ARCHITECTURE.md`.
    *   Separate logic (Graphology) from UI (React Flow).
    *   Use Zustand for state management.
3.  **Project Phases:** Respect the phased approach outlined in `docs/PHASES.md`. Do not implement features from future phases unless explicitly requested.
4.  **Test-First:** Follow the "Test-First" development strategy. Write tests for complex logic before implementing the solution.

## Coding Standards

*   **TypeScript:**
    *   Use `@ts-expect-error` instead of `@ts-ignore` when valid.
    *   Ensure all new tests are written in TypeScript (e.g., in `e2e/`).
*   **Linting:** Always run `npm run lint` to ensure code quality before submitting.

## Pre-Submit Checks

Before submitting any changes:
1.  Run `npm run lint` and fix any errors.
2.  Run `npm test` for unit tests.
3.  Run `npm run test:e2e` for integration/E2E tests.
4.  Verify that your changes do not break the build (`npm run build`).

## Documentation

*   Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
*   Phases: [docs/PHASES.md](./docs/PHASES.md)
*   Design Decisions: [docs/DESIGN_DECISIONS.md](./docs/DESIGN_DECISIONS.md)
*   Jules Context: [.jules/context.md](./.jules/context.md)
