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
    *   **Do not blindly replace `@ts-ignore` with `@ts-expect-error` without verifying that an error actually exists.** If no error exists, remove the directive entirely.
    *   Ensure all new tests are written in TypeScript (e.g., in `e2e/`).
*   **Linting:** Always run `npm run lint` to ensure code quality before submitting.
*   **DRY Principles:** Always avoid duplication and follow DRY principles. In tests, this means properly using setup helpers to encapsulate common logic.

## Pre-Submit Checks

Before submitting any changes, run these checks in order to ensure you are testing the latest compiled code:
1.  **Build:** Run `npm run build` to verify the application compiles correctly.
2.  **Lint:** Run `npm run lint` and fix any errors.
3.  **Unit Tests:** Run `npm test`.
4.  **E2E Tests:** Run `npm run test:e2e`.

## Documentation

*   Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
*   Phases: [docs/PHASES.md](./docs/PHASES.md)
*   Design Decisions: [docs/DESIGN_DECISIONS.md](./docs/DESIGN_DECISIONS.md)
*   Jules Context: [.jules/context.md](./.jules/context.md)
