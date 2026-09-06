# Development Guide

This guide is the contributor-facing entry point for working on Dependency Maritime locally.
Package scripts are the executable source of truth; verify the current commands in
[package.json](../package.json) before running them.

## Local setup

Prerequisites:

- Node.js 22.13 or later
- npm

~~~bash
npm ci
npm run dev
~~~

Use the development server for UI work. Build the full repository before handing off a change:

~~~bash
npm run build
~~~

For the packaged CLI contract, use the commands documented in [CLI](./CLI.md).

## Verification

Start with the narrowest relevant check, then run the required repository checks.

| Change | Focused verification | Required handoff verification |
| --- | --- | --- |
| UI, components, or feature logic | Relevant Vitest tests | npm run lint, npm test, npm run build |
| CLI, schemas, or artifact contract | Relevant CLI/unit tests | npm run build:cli and npm run test:cli-package; also run npm run lint |
| Browser interaction or visual behavior | Relevant Playwright test | npm run test:e2e when the affected flow is covered |
| Documentation only | Link and Markdown review | No build is required unless a referenced command or generated artifact changes |

Do not add time-based browser waits when an explicit readiness condition is available.

## Generated repository evidence

.maritime/ is the repository's canonical graph and complexity evidence. For authoritative
refactor work, build the CLI, analyze with fail-on-unmeasured, validate the result, then generate
derived graph files. Use the scripts in package.json and the detailed instructions in
[Complexity](./COMPLEXITY.md).

Do not hand-edit .maritime artifacts or generated image binaries.

## Contribution workflow

1. Start from an issue with self-contained acceptance criteria.
2. Keep the change scoped to one coherent outcome.
3. Use a pull request that closes the issue, for example: Fixes #123.
4. Record verification in the PR description.
5. Treat generated screenshots and graph images as workflow output; review them for meaningful
   regressions but do not manually edit them.

## Documentation ownership

Read and update the document that owns the subject. Keep cross-links brief; do not copy a
contract, generated values, or roadmap checklist into several documents.

| Document | Owns | Does not own |
| --- | --- | --- |
| [README](../README.md) | User-facing purpose, supported workflows, and concise feature overview | Internal implementation detail, CI diagnosis, or future task lists |
| [CLI](./CLI.md) | Public CLI commands, artifact format, validation, compatibility, and release requirements | Historical implementation status or future delivery checklists |
| [Architecture](./ARCHITECTURE.md) | Stable component boundaries, dependency direction, namespaces, and data flow | Setup instructions or transient metric results |
| [Complexity](./COMPLEXITY.md) | Metric definitions, repository thresholds, canonical generated evidence, and regeneration path | Hand-copied hotspot values or generic test strategy |
| [Quality](./QUALITY.md) | Test strategy, verification expectations, current evidence, and prioritized test gaps | Product roadmap or generated complexity evidence |
| [Roadmap](./ROADMAP.md) | Unfinished product and delivery work | Completed implementation checklists or detailed public contract |
| [Design Decisions](./DESIGN_DECISIONS.md) | Durable decisions and their rationale when alternatives matter | Day-to-day process instructions |
| [Agent Guide](../AGENTS.md) | Agent operating rules, repository map, invariants, and links to authoritative documents | A duplicate of the documents it links to |
