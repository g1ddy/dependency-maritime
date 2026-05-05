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

**Last Updated:** 2026-05-05

### 🏥 Repository Health Score: **89.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 47

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/visualization/store.ts` | **110.9** | 651 | 7 | 10 | 0.59 |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **99.5** | 240 | 22 | 7 | 0.88 |
| `src/features/visualization/components/DependencyGraph.tsx` | **85.3** | 222 | 17 | 6 | 0.86 |
| `src/features/visualization/components/GraphOverlay.tsx` | **83.8** | 275 | 8 | 11 | 0.92 |
| `src/features/visualization/logic/transformer.ts` | **74** | 270 | 13 | 3 | 0.75 |
| `src/features/visualization/components/AppNode.tsx` | **69** | 100 | 19 | 3 | 0.75 |
| `src/components/layout/Header.tsx` | **63.6** | 149 | 11 | 5 | 0.83 |
| `src/features/visualization/logic/metrics.ts` | **58.9** | 189 | 14 | 1 | 0.5 |
| `src/features/relationships/components/RelationshipOverlay.tsx` | **56.3** | 173 | 9 | 3 | 0.75 |
| `src/components/DataSourceDialog.tsx` | **55** | 117 | 11 | 4 | 0.67 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/features/visualization/components/NodeInspectorPanel.tsx` | **22** | 240 |
| `src/features/visualization/components/AppNode.tsx` | **19** | 100 |
| `src/features/visualization/components/DependencyGraph.tsx` | **17** | 222 |
| `src/features/visualization/logic/metrics.ts` | **14** | 189 |
| `src/features/visualization/logic/layout.ts` | **13** | 153 |
| `src/features/visualization/logic/transformer.ts` | **13** | 270 |
| `src/features/visualization/components/GroupNode.tsx` | **13** | 72 |
| `src/components/layout/Header.tsx` | **11** | 149 |
| `src/components/DataSourceDialog.tsx` | **11** | 117 |
| `src/components/FileUploadZone.tsx` | **11** | 91 |
