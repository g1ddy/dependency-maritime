# Graph Presentation Profiles

Maritime graph profiles are named presets over explicit presentation settings. A profile never changes canonical `.maritime/dependency-graph.json` evidence, and selecting a profile does not activate hidden renderer behavior. Every profile characteristic can be overridden independently through the CLI or composite Action.

## Profiles

| Setting | `default` | `local-architecture` | `compact-architecture` | `architecture-overview` |
| :--- | :--- | :--- | :--- | :--- |
| External packages | `direct` | `none` | `none` | `none` |
| Folder grouping | `nested` | `nested` | `nested` | `nested` |
| Edge labels | `types` | `none` | `none` | `none` |
| Layout direction | `lr` | `lr` | `lr` | `lr` |
| Rank constraints | `all` | `all` | `all` | `all` |
| Layout density | `normal` | `normal` | `compact` | `normal` |
| Module aggregation | `none` | `none` | `none` | `folders` |
| Visual theme | `standard` | `standard` | `architecture` | `architecture` |
| Source-root grouping | `preserve` | `preserve` | `elide-single` | `preserve` |
| Edge presentation | `relations` | `relations` | `semantic-pairs` | `semantic-pairs` |
| Cluster ranking | `global` | `global` | `local` | `global` |
| Aggregation depth | `2` | `2` | `2` | `2` |

### `default`

Detailed dependency inspection. It retains direct external packages and dependency-type labels.

### `local-architecture`

File-level local architecture without third-party nodes or edge labels. This is Maritime's dogfood profile.

### `compact-architecture`

File-level local architecture optimized for dense diagrams. It uses the architecture theme, compact spacing, semantic endpoint-pair edges, cluster-local ranking, and elides a sole redundant source-root wrapper. Catan Hex Mastery is the reference consumer.

### `architecture-overview`

A higher-level summary that intentionally changes information granularity. Files are aggregated into source-root-relative folder nodes and dependencies between those folders are combined. This is distinct from `compact-architecture`: compact keeps files; overview summarizes folders.

No additional intermediate profile is defined between `local-architecture` and `compact-architecture`. Consumers can create that presentation by overriding individual settings, and Maritime can add another named preset later if repeated consumer usage establishes a stable intent.

## Presentation settings

CLI options and Action inputs use the same concepts:

- `external-packages`: `none`, `summary`, `direct`
- `folder-grouping`: `none`, `top-level`, `nested`
- `edge-labels`: `none`, `types`
- `layout-direction`: `lr`, `tb`
- `rank-constraints`: `all`, `intra-folder`
- `layout-density`: `normal`, `compact`
- `module-aggregation`: `none`, `folders`
- `aggregation-depth`: positive integer
- `visual-theme`: `standard`, `architecture`
- `source-root-grouping`: `preserve`, `elide-single`
- `edge-presentation`: `relations`, `semantic-pairs`
- `cluster-ranking`: `global`, `local`

Explicit settings override the selected profile one setting at a time.

## Module aggregation

`module-aggregation=none` keeps each source file as a node.

`module-aggregation=folders` maps files into architectural folder nodes. `aggregation-depth` is counted **below the configured source root**, not from the repository path itself. For example, with source root `src`, aggregation depth `2` maps:

```text
src/features/board/components/GameHex.tsx
```

to:

```text
src/features/board
```

When `source-root-grouping=elide-single` and `src` is the sole source root, the same aggregation becomes `features/board`. With multiple roots, root identity is preserved so independently configured roots cannot collapse into one namespace.

Dependencies whose files collapse into the same folder are omitted. Multiple dependencies between the same source and target folders are combined. Under `semantic-pairs`, a count may be shown and runtime evidence wins over type/pre-compilation-only evidence when both share the same endpoints.

## Semantic edge presentation

`relations` emits dependency relationships using the standard renderer behavior.

`semantic-pairs` combines duplicate source/target relationships. Runtime relationships are primary. A pair is shown as a secondary dashed gray edge only when every underlying relationship is type/pre-compilation-only. Dynamic-only pairs remain dashed.

This presentation benefits from dependency-cruiser evidence generated with `tsPreCompilationDeps: 'specify'`. Maritime uses that value only in its portable fallback configuration; explicit and discovered consumer dependency-cruiser configurations are never rewritten.
