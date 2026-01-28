# Project Phases

## Phase 1: The "Chartroom" (MVP)
**Goal:** Load JSON and render a static graph that isn't a mess.

1.  **Schema Definition** [x]
    *   Create Zod schemas mirroring the dependency-cruiser output type (focusing on `modules`, `source`, `dependencies`, and `resolved`).
    *   Export TypeScript types inferred from the schema to ensure type safety across the app.

2.  **State Management (Zustand)** [x]
    *   Set up the Zustand store to hold the raw graph data, the Graphology instance, and React Flow nodes/edges.
    *   Implement actions to load data and reset the state.

3.  **Graph Logic Core (Headless)** [x]
    *   Implement the transformation logic: `JSON -> Graphology Graph`.
    *   Iterate through modules to create nodes and dependencies to create edges.
    *   Ensure node IDs are unique (using file paths).

4.  **Layout Implementation** [x]
    *   Implement `dagre` (via `@reactflow/dagre` or direct) to calculate node positions.
    *   Arrange nodes hierarchically (Top-Down or Left-Right) so standard dependency trees look logical.
    *   Transform the Graphology graph into React Flow primitives: create fully formed React Flow Nodes (merging data + layout positions) and Edges.

5.  **React Flow Integration** [x]
    *   Create the main Visualization component using React Flow.
    *   Render the nodes and edges from the store.
    *   Use the existing `CanvasPlaceholder` for empty states.

6.  **Load Sample Data** [x]
    *   Import `sample-data/dependency-graph.json` directly.
    *   Initialize the store with this data on application startup for immediate feedback.

7.  **Basic Interaction (Highlighting)** [x]
    *   Implement click handlers on nodes.
    *   Use Graphology traversal (neighbors, predecessors, successors) to identify connected nodes.
    *   Visually highlight the selected node and its direct ancestors (upstream) and descendants (downstream), dimming others.

8.  **File Upload (Late Phase 1)** [x]
    *   Implement a UI mechanism (Button or Dropzone) to accept a user-provided `json` file.
    *   Validate the uploaded file against the Zod schema.
    *   Update the store with the new data to replace the sample data.

9.  **Toolbar Actions (Drawer Menu)**
    *   TODO: Implement functionality for Code, Download, and Settings buttons in the new Drawer menu.

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

*   **Group/Cluster Support:** (Implemented) React Flow SubFlow renders Folders as container nodes (GroupNodes) with dashed borders and folder icons.
*   **Drag Logic:** (Implemented) Nodes can be dragged between Groups or to the Root. Logic updates the `fullPath` and `parentId` in the store, maintaining graph consistency.
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
