import * as path from 'node:path';
import type { MaritimeCruiseResult, MaritimeDependency } from '../../schema/dependency-cruiser';

type DirectoryNode = {
    directories: Map<string, DirectoryNode>;
    files: Array<{ source: string; name: string }>;
};

export const EXTERNAL_PACKAGE_MODES = ['none', 'summary', 'direct'] as const;
export const FOLDER_GROUPING_MODES = ['none', 'top-level', 'nested'] as const;
export const EDGE_LABEL_MODES = ['none', 'types'] as const;
export const LAYOUT_DIRECTION_MODES = ['lr', 'tb'] as const;
export const RANK_CONSTRAINT_MODES = ['all', 'intra-folder'] as const;
export const LAYOUT_DENSITY_MODES = ['normal', 'compact'] as const;
export const MODULE_AGGREGATION_MODES = ['none', 'folders'] as const;
export const GRAPH_PROFILE_MODES = ['default', 'local-architecture', 'compact-architecture'] as const;

export type ExternalPackagesMode = typeof EXTERNAL_PACKAGE_MODES[number];
export type FolderGroupingMode = typeof FOLDER_GROUPING_MODES[number];
export type EdgeLabelsMode = typeof EDGE_LABEL_MODES[number];
export type LayoutDirectionMode = typeof LAYOUT_DIRECTION_MODES[number];
export type RankConstraintMode = typeof RANK_CONSTRAINT_MODES[number];
export type LayoutDensityMode = typeof LAYOUT_DENSITY_MODES[number];
export type ModuleAggregationMode = typeof MODULE_AGGREGATION_MODES[number];
export type GraphProfileMode = typeof GRAPH_PROFILE_MODES[number];
export type GraphPresentationOptions = {
    externalPackages?: ExternalPackagesMode;
    folderGrouping?: FolderGroupingMode;
    edgeLabels?: EdgeLabelsMode;
    layoutDirection?: LayoutDirectionMode;
    rankConstraints?: RankConstraintMode;
    layoutDensity?: LayoutDensityMode;
    moduleAggregation?: ModuleAggregationMode;
    graphProfile?: GraphProfileMode;
};
export type ResolvedGraphPresentation = Required<Omit<GraphPresentationOptions, 'graphProfile'>>;

export const DEFAULT_GRAPH_PRESENTATION = {
    externalPackages: 'direct',
    folderGrouping: 'nested',
    edgeLabels: 'types',
    layoutDirection: 'lr',
    rankConstraints: 'all',
    layoutDensity: 'normal',
    moduleAggregation: 'none'
} as const satisfies ResolvedGraphPresentation;

export const DEFAULT_GRAPH_PROFILE = 'default' as const;
export const GRAPH_PRESENTATION_PROFILES = {
    default: DEFAULT_GRAPH_PRESENTATION,
    'local-architecture': {
        externalPackages: 'none',
        folderGrouping: 'nested',
        edgeLabels: 'none',
        layoutDirection: 'lr',
        rankConstraints: 'all',
        layoutDensity: 'normal',
        moduleAggregation: 'none'
    },
    'compact-architecture': {
        externalPackages: 'none',
        folderGrouping: 'nested',
        edgeLabels: 'none',
        layoutDirection: 'tb',
        rankConstraints: 'intra-folder',
        layoutDensity: 'compact',
        moduleAggregation: 'folders'
    }
} as const satisfies Record<GraphProfileMode, ResolvedGraphPresentation>;

/** Applies a profile first, then explicit presentation options as deterministic overrides. */
export function resolveGraphPresentation(options: GraphPresentationOptions = {}): ResolvedGraphPresentation {
    const profile = GRAPH_PRESENTATION_PROFILES[options.graphProfile ?? DEFAULT_GRAPH_PROFILE];
    return {
        externalPackages: options.externalPackages ?? profile.externalPackages,
        folderGrouping: options.folderGrouping ?? profile.folderGrouping,
        edgeLabels: options.edgeLabels ?? profile.edgeLabels,
        layoutDirection: options.layoutDirection ?? profile.layoutDirection,
        rankConstraints: options.rankConstraints ?? profile.rankConstraints,
        layoutDensity: options.layoutDensity ?? profile.layoutDensity,
        moduleAggregation: options.moduleAggregation ?? profile.moduleAggregation
    };
}

const dotQuote = (value: string): string => JSON.stringify(value);
const normalizedPath = (value: string): string => value.replaceAll('\\', '/').replace(/^\.\//, '');

function externalPackageName(value: string): string | undefined {
    const normalized = normalizedPath(value);
    const marker = 'node_modules/';
    const markerIndex = normalized.lastIndexOf(marker);
    const packagePath = markerIndex >= 0 ? normalized.slice(markerIndex + marker.length) : normalized;
    const parts = packagePath.split('/').filter(Boolean);
    if (markerIndex < 0 && (packagePath.startsWith('.') || packagePath.startsWith('/') || parts.length === 0)) {
        return undefined;
    }
    return parts[0]?.startsWith('@') && parts[1] ? `${parts[0]}/${parts[1]}` : parts[0];
}

function isExternalPath(value: string): boolean {
    return normalizedPath(value).split('/').includes('node_modules');
}

function addLocalModule(root: DirectoryNode, source: string): void {
    const parts = normalizedPath(source).split('/').filter(part => part && part !== '.');
    const name = parts.pop();
    if (!name) return;
    let directory = root;
    for (const part of parts) {
        let child = directory.directories.get(part);
        if (!child) {
            child = { directories: new Map(), files: [] };
            directory.directories.set(part, child);
        }
        directory = child;
    }
    directory.files.push({ source: normalizedPath(source), name });
}

function renderDirectory(directory: DirectoryNode, segments: string[], indent: string): string[] {
    const lines: string[] = [];
    for (const [name, child] of [...directory.directories].sort(([a], [b]) => a.localeCompare(b))) {
        const childSegments = [...segments, name];
        lines.push(`${indent}subgraph ${dotQuote(`cluster:${childSegments.join('/')}`)} {`);
        lines.push(`${indent}  label=${dotQuote(name)};`);
        lines.push(`${indent}  color="#94a3b8";`);
        lines.push(...renderDirectory(child, childSegments, `${indent}  `));
        lines.push(`${indent}}`);
    }
    for (const file of [...directory.files].sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source))) {
        lines.push(`${indent}${dotQuote(`local:${file.source}`)} [label=${dotQuote(file.name)}, shape="box"];`);
    }
    return lines;
}

function topLevelFolder(source: string): string {
    const segments = normalizedPath(source).split('/').filter(Boolean);
    segments.pop();
    return segments[0] ?? '.';
}

// Keep the source root plus its first two architectural directory segments. Deeper
// implementation detail is folded into that node; shallower paths retain their parent.
export function compactFolder(source: string): string {
    const directories = normalizedPath(source).split('/').filter(Boolean);
    directories.pop();
    return directories.slice(0, 3).join('/') || '.';
}

function edgeAttributes(dependency: MaritimeDependency, edgeLabels: EdgeLabelsMode, constrained: boolean): string {
    const attributes: string[] = [];
    if (!constrained) attributes.push('constraint="false"');
    const dependencyTypes = [...dependency.dependencyTypes].sort();
    if (edgeLabels === 'types' && dependencyTypes.length > 0) attributes.push(`label=${dotQuote(dependencyTypes.join(', '))}`);
    if (dependency.typeOnly || dependency.preCompilationOnly) attributes.push('style="dashed"');
    if (dependency.circular) attributes.push('color="#d97706"', 'penwidth="2"');
    if (!dependency.valid) {
        if (dependency.circular) attributes.push('xlabel="invalid"', 'fontcolor="#dc2626"');
        else attributes.push('color="#dc2626"', 'penwidth="2"');
    }
    return attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
}

/** Pure, deterministic conversion of a validated dependency-cruiser result to Graphviz DOT. */
export function renderDependencyGraphToDot(graph: MaritimeCruiseResult, options: GraphPresentationOptions = {}): string {
    const presentation = resolveGraphPresentation(options);
    const root: DirectoryNode = { directories: new Map(), files: [] };
    const localSources = new Set<string>();
    const externalPackages = new Set<string>();

    for (const module of graph.modules) {
        const source = normalizedPath(module.source);
        if (isExternalPath(source) || module.coreModule) continue;
        localSources.add(source);
        if (presentation.moduleAggregation === 'folders') continue;
        if (presentation.folderGrouping === 'nested') addLocalModule(root, source);
        else if (presentation.folderGrouping === 'top-level') {
            const segments = source.split('/').filter(Boolean);
            const name = segments.at(-1);
            if (segments.length <= 1 || !name) {
                root.files.push({ source, name: name ?? source });
                continue;
            }
            const [topLevel] = segments;
            const directory: DirectoryNode = root.directories.get(topLevel) ?? { directories: new Map(), files: [] };
            root.directories.set(topLevel, directory);
            directory.files.push({ source, name: path.posix.basename(source) });
        } else root.files.push({ source, name: path.posix.basename(source) });
    }

    if (presentation.moduleAggregation === 'folders') {
        const folders = [...new Set([...localSources].map(compactFolder))].sort();
        const aggregateEdges = new Map<string, { from: string; to: string; count: number; constrained: boolean }>();
        for (const module of [...graph.modules].sort((a, b) => a.source.localeCompare(b.source))) {
            const source = normalizedPath(module.source);
            if (!localSources.has(source)) continue;
            const fromFolder = compactFolder(source);
            for (const dependency of module.dependencies) {
                const resolved = normalizedPath(dependency.resolved);
                if (!localSources.has(resolved)) continue;
                const toFolder = compactFolder(resolved);
                if (fromFolder === toFolder) continue;
                const key = `${fromFolder}\0${toFolder}`;
                const current = aggregateEdges.get(key);
                if (current) current.count += 1;
                else aggregateEdges.set(key, {
                    from: fromFolder, to: toFolder, count: 1,
                    constrained: presentation.rankConstraints === 'all' || topLevelFolder(source) === topLevelFolder(resolved)
                });
            }
        }
        const lines = [
            'digraph "dependency-graph" {',
            `  graph [compound="true", newrank="true", rankdir="${presentation.layoutDirection.toUpperCase()}", fontname="Helvetica"${presentation.layoutDensity === 'compact' ? ', ranksep="0.35", nodesep="0.2"' : ''}];`,
            '  node [fontname="Helvetica", fontsize="10"];',
            '  edge [fontname="Helvetica", fontsize="8", color="#94a3b8"];',
            ...folders.map(folder => `  ${dotQuote(`folder:${folder}`)} [label=${dotQuote(folder)}, shape="folder"];`)
        ];
        for (const edge of [...aggregateEdges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
            const attributes = [
                ...(!edge.constrained ? ['constraint="false"'] : []),
                ...(edge.count > 1 ? [`label=${dotQuote(`×${edge.count}`)}`] : [])
            ];
            lines.push(`  ${dotQuote(`folder:${edge.from}`)} -> ${dotQuote(`folder:${edge.to}`)}${attributes.length ? ` [${attributes.join(', ')}]` : ''};`);
        }
        lines.push('}', '');
        return lines.join('\n');
    }

    const edges: Array<{ from: string; to: string; dependency: MaritimeDependency; constrained: boolean }> = [];
    for (const module of [...graph.modules].sort((a, b) => a.source.localeCompare(b.source))) {
        const source = normalizedPath(module.source);
        if (!localSources.has(source)) continue;
        for (const dependency of module.dependencies) {
            const resolved = normalizedPath(dependency.resolved);
            let target: string | undefined;
            if (localSources.has(resolved)) {
                target = `local:${resolved}`;
            } else if (!dependency.coreModule) {
                const looksExternal = isExternalPath(resolved) || dependency.dependencyTypes.includes('npm');
                const packageName = looksExternal
                    ? externalPackageName(isExternalPath(resolved) ? resolved : dependency.module)
                    : undefined;
                if (packageName && presentation.externalPackages !== 'none') {
                    externalPackages.add(packageName);
                    target = presentation.externalPackages === 'summary' ? 'external:boundary' : `external:${packageName}`;
                }
            }
            if (target) {
                const constrained = !localSources.has(resolved)
                    || presentation.rankConstraints === 'all'
                    || topLevelFolder(source) === topLevelFolder(resolved);
                edges.push({ from: `local:${source}`, to: target, dependency, constrained });
            }
        }
    }

    edges.sort((a, b) => a.from.localeCompare(b.from)
        || a.to.localeCompare(b.to)
        || JSON.stringify(a.dependency).localeCompare(JSON.stringify(b.dependency)));

    const lines = [
        'digraph "dependency-graph" {',
        // Graphviz 2.42 can fail init_rank when the default cluster-local ranker
        // encounters a large recursively nested directory hierarchy. newrank asks
        // dot to compute one global ranking across clusters while preserving the
        // cluster boxes and deterministic configured-direction presentation.
        `  graph [compound="true", newrank="true", rankdir="${presentation.layoutDirection.toUpperCase()}", fontname="Helvetica"${presentation.layoutDensity === 'compact' ? ', ranksep="0.35", nodesep="0.2"' : ''}];`,
        '  node [fontname="Helvetica", fontsize="10"];',
        '  edge [fontname="Helvetica", fontsize="8"];',
        ...renderDirectory(root, [], '  ')
    ];
    if (presentation.externalPackages === 'summary' && externalPackages.size > 0) {
        lines.push('  "external:boundary" [label="External packages", shape="component", style="filled,dashed", fillcolor="#e2e8f0", color="#64748b"];');
    } else if (presentation.externalPackages === 'direct' && externalPackages.size > 0) {
        lines.push('  subgraph "cluster:external-packages" {', '    label="External packages";', '    style="dashed";', '    color="#64748b";');
        for (const packageName of [...externalPackages].sort()) {
            lines.push(`    ${dotQuote(`external:${packageName}`)} [label=${dotQuote(packageName)}, shape="component", style="filled", fillcolor="#e2e8f0"];`);
        }
        lines.push('  }');
    }
    for (const edge of edges) {
        lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${edgeAttributes(edge.dependency, presentation.edgeLabels, edge.constrained)};`);
    }
    lines.push('}', '');
    return lines.join('\n');
}

export function inferGraphvizFormat(outputPath: string): 'svg' | 'dot' {
    const extension = path.extname(outputPath).toLowerCase();
    if (extension === '.svg') return 'svg';
    if (extension === '.dot') return 'dot';
    throw new Error(`Unsupported graph output format "${extension || '(none)'}". Use an .svg or .dot output path.`);
}

export { externalPackageName };
