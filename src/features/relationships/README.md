# **Field Definitions & Schema Methodology**

## **Methodology Preface**

The schema for the class\_visualization.csv dataset applies network theory to **Software Architecture Analysis**. This approach treats code entities (classes, interfaces, packages) as nodes and their dependencies as edges, allowing for the detection of architectural coupling, layering violations, and "God Objects."

To achieve a robust visualization, we employ a **Prefix-Based Semantic Grouping** strategy:

1. **Target\_**: Describes the structural attributes of the dependency (the "Target" node), allowing us to distinguish between concrete implementations, abstract interfaces, or external libraries.
2. **Relationship\_**: Describes the coupling between entities. We strictly separate the **Relationship** (the specific syntax, e.g., extends, injects) from the **Relationship\_Type** (the architectural pattern, e.g., Inheritance, Association). This enables developers to filter graphs by broad patterns (e.g., "Show all Inheritance") or specific syntax (e.g., "Show all @Injects").
3. **Reference\_**: Describes the provenance of the analysis, distinguishing between connections found via **Static Analysis** (reading the code) vs. **Runtime Tracing** (watching the code run).

## **Field Definitions Table**

| Field Name | Definition | Software Context Example |
| :---- | :---- | :---- |
| **Source** | The initiating actor or entity. In software, this is the class or module *making* the call or defining the dependency. | UserController |
| **Target** | The secondary entity connected to the Source. This is the dependency being consumed. | UserService |
| **Target\_Role** | The specific classification, type, or status of the Target node. | Class, Interface, Configuration |
| **Target\_Domain** | The broad group, layer, or cluster the Target belongs to. Used for detecting layering violations. | Business Layer, Infrastructure Layer |
| **Relationship** | The specific, verb-based description of the interaction. Describes *how* the connection is implemented in code. | injects, implements, throws |
| **Relationship\_Type** | A high-level category for the interaction. Used for filtering the graph to see specific coupling patterns. | Dependency, Inheritance, Flow |
| **Relationship\_Weight** | A numerical value representing the strength of the connection (e.g., frequency of runtime calls or static reference count). | 1 (definition), 50 (high frequency calls) |
| **Relationship\_Start** | The version or timeframe when this relationship was introduced. | v1.0, v2.1 |
| **Relationship\_End** | The version when the relationship was deprecated, removed, or is currently active. | Current, v1.0 (removed) |
| **Reference\_Type** | The method used to discover the connection (e.g., parsing source files vs. log analysis). | Static Analysis, Runtime Trace |
| **Reference\_Context** | The specific file, module, or location where the relationship is defined. | UserController.java |
| **Reference\_Date** | The specific date of the analysis or the last commit date of the file. | 2023-10-15 |
| **Notes** | Qualitative context, architectural warnings, code smells, or technical debt notes. | Constructor injection, Legacy call \- marked for refactor |
