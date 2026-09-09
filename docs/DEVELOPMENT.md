# Development Guide

This guide is the contributor-facing entry point for working on Dependency Maritime locally. Package scripts in [package.json](../package.json) are the executable source of truth.

## Local Setup

Prerequisites:
- Node.js `^22.13.0 || ^24.0.0`. Node 22.13 is the minimum API, runtime, and type baseline; Node 24 is the forward-compatibility target.
- npm

```bash
npm ci
npm run dev
```

Use the Vite development server for UI work. Build the full repository before handing off a change:

```bash
npm run build
```

For the packaged CLI contract, see [CLI and Artifact Contract](./CLI.md).

## Verification Matrix

Start with the narrowest relevant check, then run the required repository checks.

| Change | Focused Verification | Required Handoff Verification |
| --- | --- | --- |
| UI, components, or feature logic | Relevant Vitest tests (`npm test`) | `npm run lint`, `npm test`, `npm run build` |
| CLI, schemas, or artifact contract | Relevant CLI unit tests | `npm run build:cli` and `npm run test:cli-package`; also run `npm run lint` |
| Browser interaction or visual behavior | Relevant Playwright test | `npm run test:e2e` when the affected flow is covered |
| Documentation only | Link and Markdown review | No build required unless a referenced command or generated artifact changes |

Do not add time-based browser waits when an explicit readiness condition is available.

## Generated Repository Evidence

`.maritime/` is the repository's canonical graph and complexity evidence. For authoritative refactor work, build the CLI, analyze with `--fail-on-unmeasured`, validate the result, then generate derived graph files. Use the scripts in `package.json` and the detailed instructions in [Complexity and Health Metrics](./COMPLEXITY.md).

Do not hand-edit `.maritime` artifacts or generated image binaries.

## Contribution Workflow

1. Start from an issue with self-contained acceptance criteria.
2. Keep the change scoped to one coherent outcome.
3. Use a pull request that closes the issue, for example: `Fixes #123`.
4. Record verification in the PR description.
5. Treat generated screenshots and graph images as workflow output; review them for meaningful regressions but do not manually edit them.

## Documentation Ownership Matrix

Read and update the document that owns the subject. Keep cross-links brief; do not duplicate contracts, metric formulas, profile matrices, or roadmap checklists across multiple documents.

| Document | Owns | Does Not Own |
| :--- | :--- | :--- |
| [README.md](../README.md) | Product purpose, key user-facing capabilities, concise quick start, visuals, and documentation index | Detailed CLI flag tables, metric formulas, ADRs, or future task lists |
| [AGENTS.md](../AGENTS.md) | Agent operating rules, durable invariants, repository map, and canonical verification commands | Detailed duplicate contracts of the documents it links to |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System boundaries, layer responsibilities, dependency direction rules, file placement, and evidence data flow | Local setup commands or transient metric values |
| [CLI.md](./CLI.md) | Public CLI commands, manifest envelope, artifact contracts, validation rules, Action inputs, and exit codes | Graph presentation preset matrices or historical implementation logs |
| [COMPLEXITY.md](./COMPLEXITY.md) | Metric definitions, warning thresholds, compound health score formulas, and canonical repository evidence | CLI flag tables, test strategies, or product roadmap |
| [GRAPH_PROFILES.md](./GRAPH_PROFILES.md) | Named graph presentation profiles (`default`, `local-architecture`, etc.) and rendering switch semantics | Architecture analysis metrics or CLI command options |
| [QUALITY.md](./QUALITY.md) | Test strategy, verification layers, canonical test commands, test expectations, and gap prioritization | Product roadmap or transient static coverage percentages |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Contributor setup, verification matrix, generated evidence workflow, and documentation ownership | Public CLI flags or detailed feature specifications |
| [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) | Durable architectural decision records (ADRs) with explicit status (Accepted, Superseded, etc.) | Day-to-day workflow instructions or transient tasks |
| [ROADMAP.md](./ROADMAP.md) | Unfinished product intent, architectural enhancements, and explicit deferrals | Completed implementation checklists or detailed public contract specs |
| [CONSUMER_VERIFICATION.md](./CONSUMER_VERIFICATION.md) | Historical consumer verification runs against external projects (Catan, Crawler) | Active CLI contracts or active development setup |
