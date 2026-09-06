# Dependency Maritime — Agent Guide

Dependency Maritime is a local-first dependency-analysis product with two deliberately separate
surfaces:

- **Headless CLI:** the distributable TypeScript analyzer. It generates a self-contained
  `.maritime/` directory containing a dependency-cruiser graph, complexity metrics, a Markdown
  report, and a versioned manifest.
- **React UI:** a browser-based visualizer of validated dependency graphs and metrics. It is not a
  runtime dependency of the CLI package.

Keep that boundary intact. The CLI must run in a clean consumer repository without React, a
browser, or a Maritime server. The UI must treat uploaded data as untrusted and validate it before
placing it in Zustand state.

## Start here

Read these documents before changing their corresponding areas:

1. [CLI and artifact contract](docs/CLI.md) — public commands, artifact contract, compatibility,
   and release criteria.
2. [Architecture](docs/ARCHITECTURE.md) — headless-logic/interactive-UI design and the intended
   data flow.
3. [Roadmap](docs/ROADMAP.md) — planned and completed product work.
4. [Design decisions](docs/DESIGN_DECISIONS.md) — repository structure, local-first behavior, and
   performance choices.
5. [Jules context](.jules/context.md) — canonical dependency-cruiser exchange shape and project
   boundaries.
6. [README](README.md) — user-facing setup and current usage.

## Repository map

- `src/cli/` — public `maritime` commands, analyzer adapters, artifact validation, and
  package-facing exports. This is the reusable product.
- `src/schema/` — shared Zod schemas for dependency-cruiser input, complexity metrics, and the
  artifact manifest. CLI and UI must use the same contracts.
- `src/features/visualization/` — React Flow UI, graph transformation/layout logic, and
  visualization data-source dialog.
- `src/features/relationships/` — separate relationship-visualization feature; do not couple it
  to the CLI analysis pipeline.
- `config/.dependency-cruiser.cjs` — Maritime's own architecture policy. It is valid for
  Maritime dogfooding only; never treat it as a default for consumer repositories.
- `tests/cli-pack-smoke.test.ts` and `src/cli/**/*.test.ts` — packed-consumer and CLI contract
  coverage.
- `.github/workflows/cli-contract.yml` — build/package contract matrix.
- `.github/workflows/ci.yml` — general CI and release-tagging path.
- `.github/workflows/update-maritime-evidence.yml` — dogfoods the public CLI for refactor PRs, validates
  `.maritime/`, and renders repository graph SVG presentation from its graph artifact.
- `docs/images/` and existing graph image files — generated build artifacts. Regenerate them
  through the workflow/tooling; do not hand-edit image binaries.

## CLI and artifact contract

The normal consumer flow is:

```bash
maritime analyze --source app --output .maritime
maritime validate .maritime
```

A successful output directory contains:

```text
.maritime/
├── dependency-graph.json
├── complexity-metrics.json
├── complexity-report.md
└── manifest.json
```

Important invariants:

- Node `>=22.13.0`, ESLint 9+ flat config, and TypeScript frontend repositories are the current
  supported environment.
- Legacy `.eslintrc.*` and `eslintConfig` metadata are unsupported.
- Consumers may supply dependency-cruiser configuration; otherwise the CLI uses its portable
  fallback. Never assume Maritime's `src/`, `tsconfig.app.json`, or architecture rules.
- Artifact paths declared in `manifest.json` must remain inside the artifact directory.
- Use `--fail-on-unmeasured` whenever the output is authoritative CI/refactoring evidence.
  `maritime validate` validates bundle shape; it does not require measurement coverage to be
  complete.
- Keep raw `--graph` input support. When that graph lives outside `--output`, the CLI stages a
  copy inside the artifact directory; it must not modify the caller's input file.

For local development of the actual CLI entry point:

```bash
npm run build:cli
node dist/cli/main.js analyze --source src --output .maritime \
  --depcruise-config config/.dependency-cruiser.cjs --fail-on-unmeasured
node dist/cli/main.js validate .maritime
```

## Change guidance

- **CLI/schema changes:** preserve the external command, exit-code, programmatic-export, and
  artifact contracts. Add/extend packed-consumer tests; do not prove distribution behavior only by
  importing source files from this checkout.
- **UI changes:** keep graph algorithms outside React rendering, use Zustand for graph state, and
  validate uploaded dependency data with the shared Zod schemas. Do not import UI code from
  `src/cli/`.
- **dependency-cruiser changes:** preserve local-file scoping and consumer-config ownership.
  External packages and Node built-ins must not contaminate local metrics.
- **Generated artifacts/workflows:** `.maritime/` is the sole canonical repository evidence bundle.
  The UI Project Graph, Markdown hotspot report, and generated SVG graph presentation must derive from it.
  Refactor evidence must run analysis with `--fail-on-unmeasured` and then run `maritime validate` before
  any automated commit.
- **Roadmap changes:** mark only verified work complete. Keep browser ZIP archive upload and ESLint
  10 work post-MVP until their stated contracts are actually implemented.

## Verification

Use the narrowest relevant command while iterating, then run the repository checks required by the
change. The available scripts are defined in [package.json](package.json), including:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run build:cli
npm run test:cli-package
```

For a distributable CLI or artifact-contract change, `npm run build:cli` and
`npm run test:cli-package` are mandatory. CI validates that contract on Node 22 and 24.
Do not add brittle time-based browser waits; use explicit readiness conditions.
