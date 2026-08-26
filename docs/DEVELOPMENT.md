# Development Guide

This guide is the contributor-facing entry point for working on Dependency Maritime locally.
Package scripts are the executable source of truth; verify the current commands in [package.json](../package.json) before running them.

## Documentation ownership

Read and update the document that owns the subject. Keep cross-links brief; do not copy a contract, generated values, or roadmap checklist into several documents.

| Document | Owns | Does not own |
| --- | --- | --- |
| [README](../README.md) | User-facing purpose, supported workflows, and concise feature overview | Internal implementation detail, CI diagnosis, or future task lists |
| [CLI](./CLI.md) | Public CLI commands, artifact format, validation, compatibility, and release requirements | Historical implementation status or future delivery checklists |
| [Architecture](./ARCHITECTURE.md) | Stable component boundaries, data flow, shared contracts, and UI/CLI separation | Setup instructions or transient metric results |
| [Complexity](./COMPLEXITY.md) | Metric definitions, repository thresholds, canonical generated evidence, and regeneration path | Hand-copied hotspot values or generic test strategy |
| [Quality](./QUALITY.md) | Test strategy, verification expectations, current evidence, and prioritized test gaps | Product roadmap or generated complexity evidence |
| [Roadmap](./ROADMAP.md) | Unfinished product and delivery work | Completed implementation checklists or detailed public contract |
| [Design Decisions](./DESIGN_DECISIONS.md) | Durable decisions and their rationale when alternatives matter | Day-to-day process instructions |
| [Agent Guide](../AGENTS.md) | Agent operating rules, repository map, invariants, and links to authoritative documents | A duplicate of the documents it links to |

## Local setup

- Prerequisites and supported runtime
- Installing dependencies
- Starting the UI locally
- Building the distributable CLI

## Verification

- Linting, unit tests, E2E tests, and packaged-CLI checks
- Selecting the narrowest relevant checks before full verification
- Regenerating validated repository evidence

## Contributor workflow

- Branch, issue, and pull-request expectations
- Generated-artifact handling
- CI and local troubleshooting
