# Code Complexity & Health Metrics

To maintain a maintainable and scalable codebase, we track code complexity using a **Compound Complexity Score**. This document defines how we measure complexity and provides a baseline for future comparisons.

## 📊 The 5 Dimensions of Complexity

We evaluate files based on these five dimensions:

| Dimension | Metric | Tool | Warning Threshold |
| :--- | :--- | :--- | :--- |
| **Length** | **LOC** (Lines of Code) | `wc -l` | > 300 LOC |
| **Coupling** | **Fan-Out** (Dependencies) | `dependency-cruiser` | > 10 Imports |
| **Stability** | **Instability (I)** | `dependency-cruiser` | 30% - 70% (The "Zone of Pain") |
| **Logic** | **Cyclomatic Complexity** | `eslint` | > 10 |
| **Testability** | **Test Coverage** | `jest` | < 80% |

### Definitions
*   **Instability (I)**: Calculated as $I = \frac{C_{efferent}}{C_{afferent} + C_{efferent}}$, where:
    *   $C_{efferent}$ (Fan-Out): Number of classes this file depends on.
    *   $C_{afferent}$ (Fan-In): Number of classes that depend on this file.
    *   $I=0$: Extremely stable (Foundation layer).
    *   $I=1$: Extremely volatile (Top-level logic).
    *   *Zone of Pain*: Middle values imply the file changes for many reasons AND breaks many things when it changes.

## 🛠️ How to Measure

### 1. Generate Metrics Report
Use `dependency-cruiser` to generate a comprehensive metrics report including Fan-In, Fan-Out, and Instability.

```bash
npx depcruise src --config config/dependency-cruiser.cjs --output-type metrics > complexity-report.txt
```

### 2. Check Line Counts (LOC)
Identify the largest files in the system.

```bash
find src -name "*.ts" -not -name "*.test.ts" | xargs wc -l | sort -n | tail -n 10
```

### 3. Check Cyclomatic Complexity
Run ESLint to find complex functions.

```bash
npx eslint src --format json --rule 'complexity: ["warn", 10]' --parser @typescript-eslint/parser
```

---

## 📉 Complexity Baseline (Oct 2023 Refactor)

Following the "AI to Rules" refactor and "Split Coach" initiative, here are the current metrics.


## 🚨 Automated Complexity Report

**Last Updated:** 2026-01-31

### 🏥 Repository Health Score: **93.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 34

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **97.7** | 246 | 22 | 6 | 0.86 |
| `src/features/visualization/store.ts` | **75.5** | 395 | 7 | 6 | 0.5 |
| `src/features/visualization/components/GraphOverlay.tsx` | **74.9** | 227 | 7 | 10 | 0.91 |
| `src/features/visualization/components/AppNode.tsx` | **68.6** | 96 | 19 | 3 | 0.75 |
| `src/features/visualization/components/DependencyGraph.tsx` | **67.4** | 143 | 12 | 6 | 0.86 |
| `src/features/visualization/components/DataSourceDialog.tsx` | **58.7** | 200 | 6 | 5 | 0.83 |
| `src/features/visualization/logic/transformer.ts` | **54.8** | 195 | 9 | 2 | 0.67 |
| `src/features/visualization/components/GroupNode.tsx` | **54.2** | 72 | 13 | 3 | 0.75 |
| `src/features/visualization/logic/metrics.ts` | **53.7** | 157 | 13 | 1 | 0.5 |
| `src/features/visualization/logic/layout.ts` | **39.2** | 132 | 13 | 0 | 0 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 246 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 96 |
| `src/features/visualization/logic/layout.ts` | **13** | 132 |
| `src/features/visualization/logic/metrics.ts` | **13** | 157 |
| `src/features/visualization/components/GroupNode.tsx` | **13** | 72 |
| `src/features/visualization/components/DependencyGraph.tsx` | **12** | 143 |
| `src/features/visualization/logic/transformer.ts` | **9** | 195 |
| `src/features/visualization/store.ts` | **7** | 395 |
| `src/features/visualization/components/GraphOverlay.tsx` | **7** | 227 |
| `src/features/visualization/components/DataSourceDialog.tsx` | **6** | 200 |
