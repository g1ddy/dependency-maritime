# Code Complexity & Health Metrics

Dependency Maritime produces the repository's authoritative complexity and hotspot evidence in the validated [`.maritime/`](../.maritime/) artifact directory.

- [Current complexity and hotspot report](../.maritime/complexity-report.md)
- [Current per-file metrics](../.maritime/complexity-metrics.json)
- [Current dependency graph](../.maritime/dependency-graph.json)
- [Artifact manifest](../.maritime/manifest.json)

The repository-evidence workflow rebuilds this bundle with the public CLI, requires complete measurement coverage, validates it, and then renders derived presentations (such as `docs/images/dependency-graph.svg`) from that same graph artifact. Machine-readable `.maritime/` artifacts are canonical generated evidence; SVG/DOT and Markdown reports are derived presentations. Do not hand-edit or duplicate generated values in prose.

## Metrics & Health Formulas

| Dimension | Metric | Source | Warning Threshold |
| :--- | :--- | :--- | :--- |
| Length | LOC | ESLint analysis | > 300 LOC |
| Logic | Cyclomatic complexity | ESLint analysis | > 10 |
| Coupling | Fan-out ($C_{efferent}$) | dependency-cruiser graph | > 15 local dependencies |
| Coupling | Fan-in ($C_{afferent}$) | dependency-cruiser graph | Context-dependent |
| Stability | Instability ($I$) | local graph metrics | Context-dependent |
| Importance | Centrality / PageRank | UI graph metrics | Context-dependent |
| Measurement Coverage | scanned / unmeasured | Maritime artifact manifest/report | 0 unmeasured for authoritative CI |

### Definitions & Health Formulas

* **Instability:** $I = \frac{C_{efferent}}{C_{afferent} + C_{efferent}}$
  * $I = 0$ indicates a stable foundation module (many depend on it, it depends on few).
  * $I = 1$ indicates a volatile top-level module (depends on many, few depend on it).

* **Compound Complexity Score:** Hotspots and node health statuses are ranked using the compound formula:
  $$\text{Score} = \left(\frac{\text{LOC}}{10}\right) + (\text{Complexity} \times 2) + (\text{FanOut} \times 2) + (\text{Instability} \times 20)$$

* **Health Thresholds:**
  * 🟢 **Healthy:** Score < 20
  * 🟡 **Warning:** Score between 20 and 50
  * 🔴 **Unhealthy:** Score > 50

## Regenerating Repository Evidence

To regenerate and validate canonical evidence locally:

```bash
npm run build:cli
node dist/cli/main.js analyze --source src --output .maritime \
  --depcruise-config config/.dependency-cruiser.cjs --fail-on-unmeasured
node dist/cli/main.js validate .maritime
npm run generate:graph
```

For the portable CLI consumer contract and artifact validation rules, see [CLI & Artifact Contract](./CLI.md). For testing strategy and quality expectations, see [Quality](./QUALITY.md).
