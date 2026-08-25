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
| `src/cli/commands/analyze.ts` | **114.9** | 293 | 28 | 7 | 0.78 |
| `src/features/visualization/store.ts` | **112.5** | 667 | 7 | 10 | 0.59 |
| `src/cli/analyze/adapters.ts` | **107** | 450 | 24 | 2 | 0.5 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **99.5** | 240 | 22 | 7 | 0.88 |
| `src/cli/validate/validate.ts` | **98.5** | 132 | 32 | 4 | 0.67 |
| `src/features/visualization/components/DependencyGraph.tsx` | **86** | 229 | 17 | 6 | 0.86 |
| `src/features/visualization/components/GraphOverlay.tsx` | **83.8** | 275 | 8 | 11 | 0.92 |
| `src/features/visualization/logic/transformer.ts` | **74** | 270 | 13 | 3 | 0.75 |
| `src/cli/index.ts` | **70.5** | 85 | 11 | 10 | 1 |
| `src/features/visualization/components/AppNode.tsx` | **69** | 100 | 19 | 3 | 0.75 |

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
