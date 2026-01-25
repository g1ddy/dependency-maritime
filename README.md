# Dependency Maritime ⚓️

Chart, navigate, and refactor your application's architecture. An interactive visualizer for dependency-cruiser that helps you enforce clear boundaries and navigate complex dependency graphs.

## 🏗 High-Level Architecture

The application follows a "Headless Logic, Interactive UI" pattern. The heavy lifting of graph theory happens in a framework-agnostic logic layer (Graphology), which feeds a React-based renderer (React Flow).

For full details, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 🚀 Project Phases

The development is divided into 4 key phases:

1.  **Phase 1: The "Chartroom" (MVP)** - Basic visualization and layout.
2.  **Phase 2: The "Inspector"** - Metrics and health heatmaps.
3.  **Phase 3: The "Simulator"** - Refactoring playground with drag-and-drop.
4.  **Phase 4: The "Cohesion" Assistant** - AI/Algo based suggestions.

See [docs/PHASES.md](./docs/PHASES.md) for the roadmap.

## 📚 Documentation

*   [Architecture](./docs/ARCHITECTURE.md)
*   [Phases & Roadmap](./docs/PHASES.md)
*   [Design Decisions](./docs/DESIGN_DECISIONS.md)
*   [Agent Context](./.jules/context.md)

## 🛠 Getting Started (Planned)

> **Note:** The project is currently in the planning/initialization phase. Code generation has not started yet.

1.  Initialize the repo: `npm create vite@latest dependency-maritime -- --template react-ts`
2.  Install dependencies: `npm install reactflow graphology zod`
3.  Generate sample data: `npx dependency-cruiser src --output-type json > maritime-sample.json`
4.  Run the application.
