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

1.  **Metric Calculation (Headless)** [x]
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

6.  **Build Integration (Headless Analysis)**
    *   Extract the existing analysis and Markdown generation into tested, framework-independent TypeScript functions.
    *   Provide a versioned CLI package that generates dependency graph JSON, metrics JSON, and a Markdown report without starting the UI.
    *   Define a versioned artifact manifest and allow the UI to upload a complete analysis bundle.
    *   Add baseline comparison and configurable regression thresholds for build pipelines.
    *   Provide a reusable GitHub Actions workflow as a thin adapter over the CLI, not as the home of analysis logic.
    *   See [Build Integration and Report Artifacts](./BUILD_INTEGRATION.md) for the proposed contract and delivery order.

## Phase 3: The "Simulator" (Refactoring Playground)
**Goal:** The killer feature—drag and drop architecture validation and planning.

1.  **Graph Consistency & Simulation State**
    *   Implement a "Simulation Mode" in the store that tracks the *original* graph state versus the *simulated* (draft) state.
    *   Refine drag-and-drop logic to ensure that moving a node updates both the React Flow visualization and the underlying Graphology data structure (parent/child relationships) accurately.
    *   Ensure that when a node is dragged into a new folder, its `fullPath` property is updated in the simulation state to reflect the move.

2.  **Cycle & Rule Validation**
    *   **Trigger:** Execute validation checks on the `onDrop` event (finalizing a move) to ensure performance.
    *   **Cycle Detection:** Use Graphology's `findCycles` to detect if the new parent/child relationship creates a circular dependency.
    *   **Rule Engine:** Implement a flexible architectural rule validator.
        *   Rules can be defined in a simple config (e.g., "modules in `/ui` cannot import `/core`").
        *   Validator checks if the move violates these layering or boundary rules.
    *   **Visual Feedback:** If a violation occurs, *do not block the move*. Instead, visually flag the error (e.g., render the edge or node border in Red) to alert the user while allowing them to explore the "bad" state.

3.  **Refactoring Manifest (Instruction Generator)**
    *   Create a system that tracks the delta between the `originalPath` and `currentPath` for every node in the graph.
    *   Render a live "Refactoring Manifest" side-panel.
    *   **Output Format:** Display human-readable instructions for developers or AI assistants.
        *   *Example:* "Move `src/auth/login.ts` to `src/features/authentication/`"
        *   *Example:* "Move `src/utils/date.ts` to `src/shared/utils/`"

4.  **Metric Impact Analysis**
    *   Recalculate key metrics (Instability, Coupling) immediately after a node is moved.
    *   Display the *delta* in the UI to show the impact of the refactor (e.g., "Instability: 0.8 -> 0.6 (Improved)").

5.  **History Management**
    *   Implement an Undo/Redo stack for the simulation session.
    *   Allow users to step back through their drag-and-drop actions if they make a mistake or want to compare states.

## Phase 4: The "Cohesion" Assistant (AI/Algo Suggestions)
**Goal:** Algorithmic analysis to suggest architectural improvements.

1.  **Algorithmic Community Detection**
    *   Integrate Graphology's community detection algorithms (e.g., **Louvain** or **Leiden**) to identify "logical clusters" based purely on coupling and cohesion, ignoring the actual folder structure.
    *   Store these "suggested communities" as attributes on the nodes.

2.  **Drift Visualization**
    *   Visualize the discrepancy between the *physical* folder structure and the *logical* communities found by the algorithms.
    *   Highlight nodes that are "Drifting" (e.g., physically in `Folder A` but mathematically tightly coupled to `Community B`).

3.  **Auto-Generated Refactoring Plans**
    *   Build a "Suggestion Engine" that translates algorithmic findings into concrete actions.
    *   **Logic:** If Node X is in Folder A but belongs to Community B (and the cohesion gain exceeds a threshold), suggest moving Node X to Folder B.
    *   **Consistency:** Ensure these suggestions generate the *same* instruction format as Phase 3's manual manifest (e.g., "Algorithm suggests moving `helper.ts` to `/src/shared`").

4.  **Actionable Export**
    *   Implement an "Export Plan" feature for both Manual (Phase 3) and Auto (Phase 4) instructions.
    *   **Formats:**
        *   **Shell Script:** Generate a `.sh` or `.ps1` script containing `mv` or `git mv` commands.
        *   **Markdown Checklist:** A copy-pasteable list for PR descriptions or AI prompts.
    *   Allow the user to download or copy this plan to apply the architectural changes to their codebase.
