## 🚨 Automated Complexity Report

### 📐 Architectural Folder Coupling & Instability Metrics
| Folder / Namespace | Modules | Afferent ($C_a$) | Efferent ($C_e$) | Instability ($I$) |
| :--- | :--- | :--- | :--- | :--- |
| `src` | 4 | 0 ($C_a$) | 11 ($C_e$) | **1** |
| `src/cli` | 17 | 0 ($C_a$) | 3 ($C_e$) | **1** |
| `src/components` | 17 | 8 ($C_a$) | 1 ($C_e$) | **0.111** |
| `src/features/relationships` | 6 | 1 ($C_a$) | 2 ($C_e$) | **0.667** |
| `src/features/visualization` | 19 | 1 ($C_a$) | 13 ($C_e$) | **0.929** |
| `src/lib` | 1 | 16 ($C_a$) | 0 ($C_e$) | **0** |
| `src/schema` | 3 | 10 ($C_a$) | 0 ($C_e$) | **0** |


**Last Updated:** 2026-09-07

### 🏥 Repository Health Score: **74.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 65
*   **Measured Files**: 65
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/cli/graph/render-dot.ts` | **172** | 840 | 37 | 2 | 0.5 |
| `src/cli/commands/analyze.ts` | **155.3** | 389 | 41 | 9 | 0.82 |
| `src/features/visualization/store.ts` | **112.5** | 667 | 7 | 10 | 0.59 |
| `src/cli/analyze/adapters.ts` | **108.1** | 461 | 24 | 2 | 0.5 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **99.5** | 240 | 22 | 7 | 0.88 |
| `src/cli/validate/validate.ts` | **96.6** | 132 | 32 | 4 | 0.57 |
| `src/features/visualization/components/DependencyGraph.tsx` | **89.5** | 264 | 17 | 6 | 0.86 |
| `src/features/visualization/components/GraphOverlay.tsx` | **83.8** | 275 | 8 | 11 | 0.92 |
| `src/cli/analyze/architecture-debt.ts` | **81.6** | 216 | 24 | 1 | 0.5 |
| `src/cli/index.ts` | **79.9** | 99 | 11 | 14 | 1 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/cli/commands/analyze.ts` | **41** | 389 |
| `src/cli/graph/render-dot.ts` | **37** | 840 |
| `src/cli/validate/validate.ts` | **32** | 132 |
| `src/cli/analyze/adapters.ts` | **24** | 461 |
| `src/cli/analyze/architecture-debt.ts` | **24** | 216 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 240 |
| `src/cli/analyze/calculate-metrics.ts` | **19** | 200 |
| `src/cli/analyze/impact.ts` | **19** | 106 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 100 |
| `src/cli/graph/presentation.ts` | **18** | 105 |
