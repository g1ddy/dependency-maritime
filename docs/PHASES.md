# Project Phases

## Phase 1: The "Chartroom" (MVP)
**Goal:** Load JSON and render a static graph that isn't a mess.

*   **Schema Definition:** Create Zod schemas mirroring the dependency-cruiser output type.
*   **Ingestion Engine:** Build the logic to parse modules and dependencies into React Flow Nodes and Edges.
*   **Layout Implementation:** Implement Dagre to arrange nodes hierarchically (Top-Down or Left-Right) so standard dependency trees look logical.
*   **Basic Interaction:** Click a node to highlight its direct ancestors (upstream) and descendants (downstream).

## Phase 2: The "Inspector" (Metrics & Heatmaps)
**Goal:** Visualize the "health" of the code.

*   **Metric Calculation:** Use Graphology to compute metrics that DepCruiser might miss, or visualize the ones it provides:
    *   **Instability (I):** Color nodes Green (I=0, Stable) to Red (I=1, Volatile).
    *   **PageRank/Centrality:** Size nodes based on how critical they are to the system.
*   **Sidebar Details:** Click a node to open a Shadcn sheet showing:
    *   Cyclomatic Complexity.
    *   List of dependents (Who breaks if I change this?).
    *   List of dependencies (What breaks me?).

## Phase 3: The "Simulator" (Refactoring Playground)
**Goal:** The killer feature—drag and drop architecture.

*   **Group/Cluster Support:** Implement React Flow SubFlow to render Folders as containers.
*   **Drag Logic:** Allow dragging a FileNode from one FolderNode to another.
*   **Virtual Recalculation:** When a drop happens:
    *   Intercept the event.
    *   Update the in-memory graph edges.
    *   Check for Circular Dependency creation (using Graphology's `findCycles`).
    *   If a cycle is created, flash the edge RED and warn the user.

## Phase 4: The "Cohesion" Assistant (AI/Algo Suggestions)
**Goal:** Suggest improvements.

*   **Community Detection:** Run the Louvain or Leiden algorithm on the graph.
*   **Suggestion Engine:** Identify nodes that are physically in Folder A but mathematically belong to the cluster of Folder B.
*   **"Apply" Button:** (Optional) Generate a shell script or list of commands to actually move the files on disk.
