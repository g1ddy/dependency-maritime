# Development Guide

This guide is the contributor-facing entry point for working on Dependency Maritime locally.
Package scripts are the executable source of truth; verify the current commands in
[`package.json`](../package.json) before running them.

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

## Related documentation

- [Architecture](./ARCHITECTURE.md) — system boundaries and data flow
- [CLI and Artifact Contract](./CLI.md) — public CLI, artifact, and compatibility contract
- [Roadmap](./ROADMAP.md) — planned and completed product work
- [Complexity and Health Metrics](./COMPLEXITY.md) — metric definitions and canonical evidence
- [Agent Guide](../AGENTS.md) — operating rules for coding agents
