## 🚨 Automated Complexity Report

### 📐 Architectural Folder Coupling & Instability Metrics
| Folder / Namespace | Modules | Afferent ($C_a$) | Efferent ($C_e$) | Instability ($I$) |
| :--- | :--- | :--- | :--- | :--- |
| `src/App.tsx` | 1 | 1 ($C_a$) | 9 ($C_e$) | **0.9** |
| `src/cli` | 17 | 0 ($C_a$) | 3 ($C_e$) | **1** |
| `src/components` | 17 | 8 ($C_a$) | 1 ($C_e$) | **0.111** |
| `src/features` | 25 | 1 ($C_a$) | 13 ($C_e$) | **0.929** |
| `src/index.css` | 1 | 1 ($C_a$) | 0 ($C_e$) | **0** |
| `src/lib` | 1 | 16 ($C_a$) | 0 ($C_e$) | **0** |
| `src/main.tsx` | 1 | 0 ($C_a$) | 4 ($C_e$) | **1** |
| `src/schema` | 3 | 10 ($C_a$) | 0 ($C_e$) | **0** |
| `src/vite-env.d.ts` | 1 | 0 ($C_a$) | 0 ($C_e$) | **0** |


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
| `src/cli/commands/analyze.ts` | **151.4** | 370 | 40 | 9 | 0.82 |
| `src/features/visualization/store.ts` | **112.5** | 667 | 7 | 10 | 0.59 |
| `src/cli/analyze/adapters.ts` | **106.7** | 447 | 24 | 2 | 0.5 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **99.5** | 240 | 22 | 7 | 0.88 |
| `src/cli/validate/validate.ts` | **96.6** | 132 | 32 | 4 | 0.57 |
| `src/features/visualization/components/DependencyGraph.tsx` | **89.5** | 264 | 17 | 6 | 0.86 |
| `src/features/visualization/components/GraphOverlay.tsx` | **83.8** | 275 | 8 | 11 | 0.92 |
| `src/cli/index.ts` | **79.9** | 99 | 11 | 14 | 1 |
| `src/cli/commands/graph.ts` | **74.2** | 249 | 14 | 4 | 0.67 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/cli/commands/analyze.ts` | **40** | 370 |
| `src/cli/graph/render-dot.ts` | **37** | 840 |
| `src/cli/validate/validate.ts` | **32** | 132 |
| `src/cli/analyze/adapters.ts` | **24** | 447 |
| `src/cli/analyze/impact.ts` | **22** | 117 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 240 |
| `src/cli/analyze/calculate-metrics.ts` | **20** | 185 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 100 |
| `src/cli/graph/presentation.ts` | **18** | 105 |
| `src/features/visualization/components/DependencyGraph.tsx` | **17** | 264 |
