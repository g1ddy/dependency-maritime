# Jules Context & Instructions

This file defines the domain boundaries, schemas, and rules for the Dependency Maritime project.

## 1. The Schema (Dependency Cruiser Output)

**TODO:** Replace this with the exact TypeScript interface from `dependency-cruiser` output once available.
For now, assume the standard JSON structure:

```typescript
export interface ICruiseResult {
  modules: IModule[];
  summary: any;
}

export interface IModule {
  source: string;
  dependencies: IDependency[];
  valid: boolean;
  // ... other fields like orphan, reachable, etc.
}

export interface IDependency {
  module: string;
  moduleSystem: string;
  dynamic: boolean;
  // ... other fields like circular, valid, etc.
}
```

## 2. Architectural Rules

*   **Vertical Slice Architecture:** We prefer Vertical Slice Architecture over Layered Architecture. Organize code by feature, not by technical layer (e.g., `features/GraphVisualizer` instead of `components/Graph`, `hooks/Graph`).
*   **Headless Logic:** Keep graph algorithms and logic completely decoupled from React components. Use `Graphology` for the heavy lifting.
*   **Local-First:** The application must work locally without external dependencies for the core logic.

## 3. Prompting Strategies

### Graphology Logic
When asking Jules to implement graph algorithms, use the following pattern:
> "Jules, write a function using graphology that accepts a Graph object and returns [result]. Use [specific algorithm if known, e.g., Tarjan's algorithm]."

### Test-First Development
Before implementing features, especially complex logic like Phase 3 (Simulator), ensure robust testing:
> "Write a Vitest unit test that fails if [condition, e.g., moving a node creates a circular dependency]."

### Component Scaffolding
When creating UI components:
> "Scaffold a custom React Flow node component using Tailwind CSS. It should visually represent a file, have a handle on the top and bottom, and change background color based on a prop [e.g., instability]."
