# Jules Context & Instructions

This file defines the domain boundaries, schemas, and rules for the Dependency Maritime project.

## 1. The Schema (Dependency Cruiser Output)

This project uses the official `ICruiseResult` interface from the `dependency-cruiser` package.

```typescript
export interface ICruiseResult {
  modules: IModule[];
  folders?: IFolder[];
  summary: ISummary;
  revisionData?: IRevisionData;
}

export interface IModule {
  source: string;
  valid: boolean;
  dependencies: IDependency[];
  dependents: string[];
  coreModule?: boolean;
  couldNotResolve?: boolean;
  dependencyTypes?: DependencyType[];
  followable?: boolean;
  license?: string;
  matchesDoNotFollow?: boolean;
  matchesFocus?: boolean;
  matchesReaches?: boolean;
  matchesHighlight?: boolean;
  orphan?: boolean;
  reachable?: IReachable[];
  reaches?: IReaches[];
  rules?: IRuleSummary[];
  consolidated?: boolean;
  instability?: number;
  experimentalStats?: ExperimentalStatsType;
  checksum?: string;
}

export interface IDependency {
  circular: boolean;
  coreModule: boolean;
  couldNotResolve: boolean;
  preCompilationOnly?: boolean;
  typeOnly?: boolean;
  cycle?: IMiniDependency[];
  dependencyTypes: DependencyType[];
  dynamic: boolean;
  exoticallyRequired: boolean;
  exoticRequire?: string;
  followable: boolean;
  license?: string;
  matchesDoNotFollow?: boolean;
  module: string;
  protocol: ProtocolType;
  mimeType: string;
  moduleSystem: ModuleSystemType;
  resolved: string;
  rules?: IRuleSummary[];
  valid: boolean;
  instability: number;
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
