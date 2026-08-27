# Codex Environment Scripts

These scripts prepare the ChatGPT Codex environment for Maritime.

## `maintenance.sh`

Use this when resuming an existing environment after pulling changes or switching branches.

```bash
./scripts/maintenance.sh
```

It refreshes the development environment by:

- reconciling npm dependencies with `npm install`;
- installing the Chromium and WebKit browsers used by Playwright;
- installing Playwright system dependencies;
- installing Graphviz for dependency graph generation.

## `setup.sh`

Use this for a fresh Codex environment.

```bash
./scripts/setup.sh
```

It runs `maintenance.sh`, then verifies the important environment assumptions:

- Node.js and npm are available;
- Playwright browsers were installed;
- Graphviz is available;
- the unit-test runner can start.

`setup.sh` is therefore the fresh-environment entry point, while `maintenance.sh` owns the reusable dependency/tool preparation work.
