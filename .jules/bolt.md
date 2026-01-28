# Bolt's Journal

## 2024-05-22 - [React Flow Minimap Optimization]
**Learning:** React Flow's `MiniMap` re-renders completely if the `nodeColor` prop changes reference. Defining this function inline in the parent component causes unnecessary re-renders of the entire MiniMap on every parent render.
**Action:** Always define `nodeColor` outside the component or `useCallback` it with stable dependencies.
