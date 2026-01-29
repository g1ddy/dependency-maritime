# Test Coverage Analysis & Gap Evaluation

## Overview

After configuring the test coverage report to exclude boilerplate and non-essential files, we have identified several critical areas of the codebase that lack sufficient test coverage. This document outlines the high-priority modules that require thorough testing to ensure application stability and prevent regressions.

## Crucial Classes/Modules Needing Tests

### 1. Graph Layout Logic (`src/features/visualization/logic/layout.ts`)
- **Current Coverage:** 0%
- **Criticality:** High
- **Reasoning:** This module is responsible for positioning nodes in the visualization. Any bug here directly breaks the primary user experience (the graph). It likely involves complex calculations for DAG (Directed Acyclic Graph) layout that should be verified with unit tests covering various graph structures (empty, single node, complex trees, cycles).

### 2. Data Loading & Parsing (`src/features/visualization/components/DataSourceDialog.tsx`)
- **Current Coverage:** 0%
- **Criticality:** High
- **Reasoning:** This component handles the entry point for data into the application (parsing JSON, validating schema, handling file uploads). If this fails, the user cannot use the app at all.
- **Recommendation:** Tests should verify:
    - Successful parsing of valid JSON.
    - Error handling for invalid JSON or schema violations.
    - Drag-and-drop event handling (can be unit tested or E2E).

### 3. Graph State Management (`src/features/visualization/store.ts`)
- **Current Coverage:** ~59%
- **Criticality:** High
- **Reasoning:** While some tests exist, there is significant missing coverage (e.g., lines 240-253, 323-329). This store acts as the "brain" of the application, managing the graph data, user interactions (selection, filtering), and computed state.
- **Recommendation:** Improve coverage to handle edge cases in actions like `reparentNode`, `setGraphData` (async flow), and complex filter combinations.

### 4. Metrics Calculation (`src/features/visualization/logic/metrics.ts`)
- **Current Coverage:** 25%
- **Criticality:** Medium-High
- **Reasoning:** This module calculates software metrics (likely instability, centrality, etc.). Incorrect calculations leads to misleading insights for the user. These are pure functions and are ideal candidates for high-coverage unit tests.

### 5. Node Rendering Logic (`src/features/visualization/components/AppNode.tsx`)
- **Current Coverage:** ~5%
- **Criticality:** Medium
- **Reasoning:** This component renders the individual file nodes. It contains logic for interactivity (clicks, dragging) and conditional rendering based on node state.
- **Recommendation:** Verify that interactions trigger the correct store actions and that props map correctly to visual elements (labels, colors).

## Summary Table

| Module | Type | Current Coverage | Priority |
|--------|------|------------------|----------|
| `layout.ts` | Logic | 0% | 🚨 Critical |
| `DataSourceDialog.tsx` | Component/Feature | 0% | 🚨 Critical |
| `store.ts` | State | ~59% | 🔥 High |
| `metrics.ts` | Logic | 25% | 🔥 High |
| `AppNode.tsx` | Component | ~5% | ⚠️ Medium |

## Next Steps

1.  **Immediate Action:** Write unit tests for `layout.ts` and `metrics.ts` as they are pure logic and high risk.
2.  **Secondary Action:** Add integration tests for `DataSourceDialog.tsx` to ensure data loading robustness.
3.  **Ongoing:** Gradually increase `store.ts` coverage as new features touch state management.
