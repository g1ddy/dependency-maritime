# Project Phases

## Phase 1: The "Chartroom" (MVP)
**Goal:** Load JSON and render a static graph that isn't a mess.

1.  **Schema Definition**
    *   Create Zod schemas mirroring the dependency-cruiser output type (focusing on `modules`, `source`, `dependencies`, and `resolved`).
    *   Export TypeScript types inferred from the schema to ensure type safety across the app.

2.  **State Management (Zustand)**
    *   Set up the Zustand store to hold the raw graph data, the Graphology instance, and React Flow nodes/edges.
    *   Implement actions to load data and reset the state.

3.  **Graph Logic Core (Headless)**
    *   Implement the transformation logic: `JSON -> Graphology Graph`.
    *   Iterate through modules to create nodes and dependencies to create edges.
    *   Ensure node IDs are unique (using file paths).

4.  **Layout Implementation**
    *   Implement `dagre` (via `@reactflow/dagre` or direct) to calculate node positions.
    *   Arrange nodes hierarchically (Top-Down or Left-Right) so standard dependency trees look logical.
    *   Transform the Graphology graph into React Flow primitives: create fully formed React Flow Nodes (merging data + layout positions) and Edges.

5.  **React Flow Integration**
    *   Create the main Visualization component using React Flow.
    *   Render the nodes and edges from the store.
    *   Use the existing `CanvasPlaceholder` for empty states.

6.  **Load Sample Data**
    *   Import `sample-data/dependency-graph.json` directly.
    *   Initialize the store with this data on application startup for immediate feedback.

7.  **Basic Interaction (Highlighting)**
    *   Implement click handlers on nodes.
    *   Use Graphology traversal (neighbors, predecessors, successors) to identify connected nodes.
    *   Visually highlight the selected node and its direct ancestors (upstream) and descendants (downstream), dimming others.

8.  **File Upload (Late Phase 1)**
    *   Implement a UI mechanism (Button or Dropzone) to accept a user-provided `json` file.
    *   Validate the uploaded file against the Zod schema.
    *   Update the store with the new data to replace the sample data.

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
