# Code Complexity & Health Metrics

Dependency Maritime produces the repository's authoritative complexity and hotspot evidence in the validated [`.maritime/`](../.maritime/) artifact directory.

- [Current complexity and hotspot report](../.maritime/complexity-report.md)
- [Current per-file metrics](../.maritime/complexity-metrics.json)
- [Current dependency graph](../.maritime/dependency-graph.json)
- [Artifact manifest](../.maritime/manifest.json)

The refactor workflow rebuilds this bundle with the public CLI, requires complete measurement coverage, validates it, and then regenerates the DOT and graph images from the same graph artifact. Do not hand-edit or duplicate these generated values elsewhere in the repository.

## Metrics

| Dimension | Metric | Source | Warning threshold |
| :--- | :--- | :--- | :--- |
| Length | LOC | ESLint analysis | > 300 LOC |
| Coupling | Fan-out | dependency-cruiser graph | > 15 local dependencies |
| Stability | Instability | local graph metrics | context-dependent |
| Logic | Cyclomatic complexity | ESLint analysis | > 10 |
| Importance | Centrality/PageRank | UI graph metrics | context-dependent |
| Measurement coverage | scanned/unmeasured | Maritime artifact manifest/report | 0 unmeasured for authoritative CI |

### Definitions

**Instability** is calculated as $I = \frac{C_{efferent}}{C_{afferent} + C_{efferent}}$, where:

- **Fan-out** ($C_{efferent}$) is the number of local files a file depends on.
- **Fan-in** ($C_{afferent}$) is the number of local files that depend on it.
- $I = 0$ is a stable foundation layer; $I = 1$ is volatile top-level logic.

**Centrality/PageRank** estimates a node's importance from its connections. It is useful for visual prioritization, not by itself a refactoring mandate.

The Markdown report ranks hotspots with the compound score:

```text
(LOC / 10) + (Complexity * 2) + (FanOut * 2) + (Instability * 20)
```

## Regenerating repository evidence

```bash
npm run build:cli
node dist/cli/main.js analyze --source src --output .maritime \
  --depcruise-config config/.dependency-cruiser.cjs --fail-on-unmeasured
node dist/cli/main.js validate .maritime
npm run generate:dot
npm run generate:graph
```

For the portable consumer contract and artifact validation rules, see [CLI and Artifact Contract](./CLI.md). For testing strategy and prioritized gaps, see [Quality](./QUALITY.md).
