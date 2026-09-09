# Dependency Maritime ⚓️

![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/react-19.2.3-blue)
![Vite](https://img.shields.io/badge/vite-7.3.1-purple)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue)

**Chart, navigate, and refactor your application's architecture.**

Dependency Maritime is a local-first dependency analysis tool and interactive visualization environment for [dependency-cruiser](https://github.com/sverweij/dependency-cruiser). It transforms complex code dependency graphs into navigable interactive maps and machine-readable evidence, helping you enforce architectural boundaries, identify tangles, analyze complexity, and plan refactoring efforts.

## 📸 Visuals

### Interactive Dashboard
Visualize your project's structure with an interactive graph. Zoom, pan, and filter to understand relationships.
![Dashboard View](docs/images/screenshot-dashboard.png)

### Node Inspector
Select any file to view detailed metrics, including incoming and outgoing dependencies, lines of code, and cyclomatic complexity.
![Node Inspector](docs/images/screenshot-inspector.png)

### Bring Your Own Data
Easily upload your own `.maritime` artifact bundle or `dependency-cruiser` JSON output to visualize your codebase.
![Upload Data](docs/images/screenshot-upload.png)

## ✨ Features

* **Interactive Visualization:** Explore your architecture with interactive React Flow and Graphology-powered layouts.
* **Deep Inspection:** Select nodes to inspect dependency paths, metrics, fan-in, fan-out, complexity, and direct connections.
* **Architecture Debt & PR Change Impact:** Evaluate violations against baselines and track transitive change impact across pull requests.
* **100% Local-First Processing:** Code structure is analyzed locally on your machine or in your CI runner; no source code or metrics leave your environment.

## 🚀 Quick Start

### 1. Local CLI Analysis

Install the headless analyzer in your project to produce validated `.maritime` evidence:

```bash
npm install --save-dev @dependency-maritime/cli
npx maritime analyze --source src --output .maritime --fail-on-unmeasured
npx maritime validate .maritime
```

Optionally render an SVG presentation from the validated evidence:

```bash
npx maritime graph --input .maritime --output docs/images/dependency-graph.svg --graph-profile local-architecture
```

### 2. GitHub Actions CI

Automate analysis, validation, and optional rendering in GitHub Actions using the composite action:

```yaml
- uses: g1ddy/dependency-maritime@cli-v0.1.0-beta.8
  with:
    source-roots: src
    render-graph: 'true'
    graph-profile: local-architecture
```

For supported runtime environments, full CLI flags, baseline modes, and profile details, see [CLI and Artifact Contract](docs/CLI.md) and [Graph Presentation Profiles](docs/GRAPH_PROFILES.md).

### 3. Local UI Development

To run the interactive visualization dashboard locally:

```bash
git clone https://github.com/g1ddy/dependency-maritime.git
cd dependency-maritime
npm install
npm run dev
```

Open `http://localhost:5173` in your browser, then click the **Upload** button to load a `.maritime` evidence bundle or dependency graph JSON file.

## 📚 Documentation Index

* [Agent Guide](AGENTS.md) — Contributor & agent invariants and operating rules.
* [Architecture](docs/ARCHITECTURE.md) — System boundaries, layer responsibilities, and data flow.
* [CLI & Artifact Contract](docs/CLI.md) — Public commands, manifest schema, GitHub Action mapping, and exit codes.
* [Code Complexity & Health Metrics](docs/COMPLEXITY.md) — Metric definitions, thresholds, compound health score formulas, and canonical evidence.
* [Graph Presentation Profiles](docs/GRAPH_PROFILES.md) — Presentation presets and rendering override semantics.
* [Quality & Test Strategy](docs/QUALITY.md) — Verification layers, test commands, and quality strategy.
* [Development Guide](docs/DEVELOPMENT.md) — Setup instructions, canonical verification commands, and documentation ownership.
* [Design Decisions](docs/DESIGN_DECISIONS.md) — Key architectural decision records and historical rationale.
* [Product Roadmap](docs/ROADMAP.md) — Unfinished product capabilities, intent, and deferrals.

## 📝 License

Distributed under the MIT License.
