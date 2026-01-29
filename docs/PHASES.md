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

## Phase 2: The "Inspector" (Metrics & Heatmaps)
**Goal:** Visualize the "health" of the code and handle scale.

1.  **Metric Calculation (Headless)**
    *   Implement calculation logic for software metrics using Graphology.
    *   **Instability:** Calculate $I = Ce / (Ca + Ce)$ for each node.
    *   **Centrality:** Compute PageRank or Betweenness centrality to identify critical nodes.
    *   Store these computed metrics as attributes on the Graphology nodes.
    *   **Folder-Level Metrics:** Aggregate metrics (Instability, Size) to the Group/Folder level to visualize architectural "Hotspots" at a macro level.

2.  **Inspector Panel (UI)**
    *   Implement a "Node Details" Sidebar/Sheet (replacing simple highlighting).
    *   When a node is selected, show its full path, file type, and computed metrics (Instability Score, Centrality, Cyclomatic Complexity).
    *   Display interactive lists of **Dependencies** (outgoing) and **Dependents** (incoming) that allow navigation to those nodes.
    *   **Deep Analysis Tools:** Include "Shortest Path" (select two nodes to see the chain) and "Impact Analysis" (visualize what percentage of the system's nodes are affected by this node).

3.  **Heatmap Visualization (View Modes)**
    *   Implement "Settings" controls to switch between Graph View Modes.
    *   **Normal Mode:** Standard file-type coloring.
    *   **Instability Heatmap:** Color nodes from Green (Stable, $I=0$) to Red (Volatile, $I=1$).
    *   **Importance View:** Size nodes based on Centrality/PageRank (larger = more critical).

4.  **Advanced Layout & Scaling (Fixing "Awkward Graphs")**
    *   **Problem:** Large graphs using `dagre` become overly tall or wide, making navigation difficult.
    *   **Solution:** Integrate **ELK (Eclipse Layout Kernel)** or **Force-Directed Layouts** (d3-force/react-force-graph behavior).
    *   **Interactive Layouts:** Allow users to toggle between "Hierarchical" (Dagre - good for small flows) and "Force/Compact" (ELK/Force - good for large architectural clusters).

5.  **Export & Reporting**
    *   Implement "Export" functionality (Download button).
    *   Allow exporting the current graph visualization as an Image (PNG/SVG) for documentation.
    *   (Optional) Export a "Health Report" summarizing the most unstable or central modules.

## Phase 3: The "Simulator" (Refactoring Playground)
**Goal:** The killer feature—drag and drop architecture.

*   **Group/Cluster Support:** (Implemented) React Flow SubFlow renders Folders as container nodes (GroupNodes) with dashed borders and folder icons.
*   **Drag Logic:** (Implemented) Nodes can be dragged between Groups or to the Root. Logic updates the `fullPath` and `parentId` in the store, maintaining graph consistency.
*   **Real-time Architecture Validation:** When a drop happens:
    *   Intercept the event.
    *   Update the in-memory graph edges.
    *   **Cycle Detection:** Check for Circular Dependency creation (using Graphology's `findCycles`).
    *   **Rule Validation:** Verify architectural rules from a configuration file (e.g., "UI should not import Core").
    *   If a violation occurs, flash the edge RED and warn the user.

## Phase 4: The "Cohesion" Assistant (AI/Algo Suggestions)
**Goal:** Suggest improvements.

*   **Community Detection:** Run the Louvain or Leiden algorithm on the graph to automatically identify clusters.
*   **Suggestion Engine:** Identify nodes that are physically in Folder A but mathematically belong to the cluster of Folder B.
*   **"Code" / "Apply" Action:**
    *   Implement the functionality for the **Code** button.
    *   Generate a shell script (`mv source dest`) or Refactoring Plan based on the user's drag-and-drop actions in Phase 3.
    *   Allow the user to copy or download this script to apply changes to their actual codebase.
