## 🚨 Automated Complexity Report

**Last Updated:** 2026-08-25

### 🏥 Repository Health Score: **82.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Graph Files**: 59
*   **Measured Files**: 59
*   **Unmeasured Files**: 0

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/cli/analyze/adapters.ts` | **124.8** | 450 | 24 | 9 | 0.69 |
| `src/cli/commands/analyze.ts` | **119.6** | 293 | 28 | 10 | 0.71 |
| `src/features/visualization/store.ts` | **118.7** | 667 | 7 | 14 | 0.5 |
| `src/cli/validate/validate.ts` | **104.2** | 132 | 32 | 6 | 0.75 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **102.4** | 240 | 22 | 9 | 0.82 |
| `src/features/visualization/components/DependencyGraph.tsx` | **96.9** | 229 | 17 | 12 | 0.8 |
| `src/features/visualization/components/GraphOverlay.tsx` | **90.2** | 275 | 8 | 14 | 0.93 |
| `src/features/visualization/components/AppNode.tsx` | **77.1** | 100 | 19 | 6 | 0.86 |
| `src/features/visualization/logic/transformer.ts` | **75.5** | 270 | 13 | 5 | 0.63 |
| `src/cli/index.ts` | **70.5** | 85 | 11 | 10 | 1 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/cli/validate/validate.ts` | **32** | 132 |
| `src/cli/commands/analyze.ts` | **28** | 293 |
| `src/cli/analyze/adapters.ts` | **24** | 450 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 240 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 100 |
| `src/features/visualization/components/DependencyGraph.tsx` | **17** | 229 |
| `src/features/visualization/logic/metrics.ts` | **14** | 189 |
| `src/features/visualization/components/GroupNode.tsx` | **13** | 72 |
| `src/features/visualization/logic/layout.ts` | **13** | 151 |
| `src/features/visualization/logic/transformer.ts` | **13** | 270 |
