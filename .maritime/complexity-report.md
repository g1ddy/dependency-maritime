## 🚨 Automated Complexity Report

**Last Updated:** 2026-09-06

### 🏥 Repository Health Score: **78.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 63
*   **Measured Files**: 63
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/cli/graph/render-dot.ts` | **172** | 840 | 37 | 2 | 0.5 |
| `src/cli/commands/analyze.ts` | **114.9** | 293 | 28 | 7 | 0.78 |
| `src/features/visualization/store.ts` | **112.5** | 667 | 7 | 10 | 0.59 |
| `src/cli/analyze/adapters.ts` | **106.5** | 445 | 24 | 2 | 0.5 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **99.5** | 240 | 22 | 7 | 0.88 |
| `src/cli/validate/validate.ts` | **96.6** | 132 | 32 | 4 | 0.57 |
| `src/features/visualization/components/DependencyGraph.tsx` | **89.5** | 264 | 17 | 6 | 0.86 |
| `src/features/visualization/components/GraphOverlay.tsx` | **83.8** | 275 | 8 | 11 | 0.92 |
| `src/cli/index.ts` | **79.9** | 99 | 11 | 14 | 1 |
| `src/cli/commands/graph.ts` | **74.2** | 249 | 14 | 4 | 0.67 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/cli/graph/render-dot.ts` | **37** | 840 |
| `src/cli/validate/validate.ts` | **32** | 132 |
| `src/cli/commands/analyze.ts` | **28** | 293 |
| `src/cli/analyze/adapters.ts` | **24** | 445 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 240 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 100 |
| `src/cli/graph/presentation.ts` | **18** | 105 |
| `src/features/visualization/components/DependencyGraph.tsx` | **17** | 264 |
| `src/cli/commands/graph.ts` | **14** | 249 |
| `src/features/visualization/logic/metrics.ts` | **14** | 189 |
