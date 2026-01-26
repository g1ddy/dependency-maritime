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

**Last Updated:** 2026-01-26

### 🏥 Repository Health Score: **100.0 / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > 300, Complexity > 10, Fan-Out > 15).
*   **Total Files Scanned**: 20

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/visualization/components/GraphOverlay.tsx` | **40.7** | 120 | 1 | 5 | 0.83 |
| `src/components/ui/sheet.tsx` | **39.9** | 139 | 2 | 1 | 1 |
| `src/components/ui/dropdown-menu.tsx` | **36** | 200 | 2 | 1 | 0.5 |
| `src/main.tsx` | **29.9** | 19 | 1 | 3 | 1 |
| `src/components/ui/tooltip.tsx` | **29.1** | 31 | 2 | 1 | 1 |
| `src/components/ui/badge.tsx` | **27.7** | 37 | 1 | 1 | 1 |
| `src/components/mode-toggle.tsx` | **26.8** | 38 | 1 | 3 | 0.75 |
| `src/components/ui/input.tsx` | **26.3** | 23 | 1 | 1 | 1 |
| `src/App.tsx` | **24.8** | 18 | 1 | 3 | 0.75 |
| `src/components/ui/separator.tsx` | **23** | 30 | 4 | 1 | 0.5 |

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
| `src/components/theme-provider.tsx` | **4** | 77 |
| `src/components/ui/separator.tsx` | **4** | 30 |
| `src/components/ui/button.tsx` | **3** | 58 |
| `src/components/ui/dropdown-menu.tsx` | **2** | 200 |
| `src/components/ui/sheet.tsx` | **2** | 139 |
| `src/components/ui/tooltip.tsx` | **2** | 31 |
| `src/App.tsx` | **1** | 18 |
| `src/components/layout/Header.tsx` | **1** | 23 |
| `src/components/mode-toggle.tsx` | **1** | 38 |
| `src/lib/utils.ts` | **1** | 7 |
