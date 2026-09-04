import * as path from 'node:path';
import type { MaritimeCruiseResult, MaritimeDependency, MaritimeModule } from '../../schema/dependency-cruiser';

type LocalFile = {
    source: string;
    name: string;
    orphan?: boolean;
};

type DirectoryNode = {
    directories: Map<string, DirectoryNode>;
    files: LocalFile[];
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
export type GraphRenderContext = {
    sourceRoots?: string[];
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
        layoutDirection: 'lr',
        rankConstraints: 'all',
        layoutDensity: 'compact',
        moduleAggregation: 'none'
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
const normalizedPath = (value: string): string => value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');

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

function localFileFromModule(module: MaritimeModule, source: string): LocalFile {
    return {
        source,
        name: path.posix.basename(source),
        orphan: module.orphan
    };
}

function addLocalModule(root: DirectoryNode, module: MaritimeModule, source: string): void {
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
    directory.files.push({ source, name, orphan: module.orphan });
}

function nodeFillColor(file: LocalFile): string {
    if (file.orphan === true) return '#ccffcc';
    const source = file.source;
    if (/\.json$/u.test(source)) return '#ffee44';
    if (/\.jsx$/u.test(source)) return '#ffff77';
    if (/\.vue$/u.test(source)) return '#41f083';
    if (/\.tsx$/u.test(source)) return '#bbfeff';
    if (/\.([cm]?ts)$/u.test(source)) return '#ddfeff';
    if (/\.svelte$/u.test(source)) return '#febbff';
    if (/(\.coffee|\.litcoffee|\.coffee\.md)$/u.test(source)) return '#eeccaa';
    if (/(\.csx|\.cjsx)$/u.test(source)) return '#eebb77';
    if (/\.ls$/u.test(source)) return 'pink';
    return '#ffffcc';
}

function renderDirectory(directory: DirectoryNode, segments: string[], indent: string, compactTheme: boolean): string[] {
    const lines: string[] = [];
    for (const [name, child] of [...directory.directories].sort(([a], [b]) => a.localeCompare(b))) {
        const childSegments = [...segments, name];
        lines.push(`${indent}subgraph ${dotQuote(`cluster:${childSegments.join('/')}`)} {`);
        lines.push(`${indent}  label=${dotQuote(name)};`);
        if (compactTheme) {
            lines.push(`${indent}  color="black";`);
            lines.push(`${indent}  fontcolor="black";`);
            lines.push(`${indent}  fontname="Helvetica-Bold";`);
            lines.push(`${indent}  fontsize="9";`);
            lines.push(`${indent}  penwidth="2";`);
            lines.push(`${indent}  margin="4";`);
            lines.push(`${indent}  style="rounded,bold,filled";`);
            lines.push(`${indent}  fillcolor="#ffffff";`);
        } else {
            lines.push(`${indent}  color="#94a3b8";`);
        }
        lines.push(...renderDirectory(child, childSegments, `${indent}  `, compactTheme));
        lines.push(`${indent}}`);
    }
    for (const file of [...directory.files].sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source))) {
        if (compactTheme) {
            lines.push(`${indent}${dotQuote(`local:${file.source}`)} [label=${dotQuote(file.name)}, shape="box", style="rounded,filled", color="black", fillcolor=${dotQuote(nodeFillColor(file))}, fontcolor="black", fontname="Helvetica", fontsize="9", height="0.2", margin="0.06,0.035"];`);
        } else {
            lines.push(`${indent}${dotQuote(`local:${file.source}`)} [label=${dotQuote(file.name)}, shape="box"];`);
        }
    }
    return lines;
}

function findDirectory(root: DirectoryNode, directoryPath: string): { directory: DirectoryNode; segments: string[] } | undefined {
    const segments = normalizedPath(directoryPath).split('/').filter(Boolean);
    if (segments.length === 0) return { directory: root, segments: [] };
    let directory = root;
    for (const segment of segments) {
        const child = directory.directories.get(segment);
        if (!child) return undefined;
        directory = child;
    }
    return { directory, segments };
}

function inferSourceRoots(graph: MaritimeCruiseResult): string[] | undefined {
    const optionsUsed = graph.summary.optionsUsed;
    if (!optionsUsed || typeof optionsUsed !== 'object') return undefined;
    const args = (optionsUsed as { args?: unknown }).args;
    if (Array.isArray(args)) {
        const roots = args.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        return roots.length > 0 ? roots : undefined;
    }
    if (typeof args === 'string') {
        const roots = args.split(/[\s,]+/u).map(value => value.trim()).filter(Boolean);
        return roots.length > 0 ? roots : undefined;
    }
    return undefined;
}

function renderLocalTree(
    root: DirectoryNode,
    graph: MaritimeCruiseResult,
    context: GraphRenderContext,
    compactTheme: boolean
): string[] {
    const sourceRoots = context.sourceRoots ?? inferSourceRoots(graph);
    if (compactTheme && sourceRoots?.length === 1) {
        const sourceRoot = normalizedPath(sourceRoots[0]);
        if (sourceRoot && sourceRoot !== '.') {
            const resolved = findDirectory(root, sourceRoot);
            if (resolved) return renderDirectory(resolved.directory, resolved.segments, '  ', compactTheme);
        }
    }
    return renderDirectory(root, [], '  ', compactTheme);
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

type AggregatedEdge = {
    from: string;
    to: string;
    count: number;
    constrained: boolean;
    dependencyTypes: Set<string>;
    allNonRuntime: boolean;
    allDynamic: boolean;
    circular: boolean;
    valid: boolean;
};

function mergeAggregatedEdge(edge: AggregatedEdge, dependency: MaritimeDependency): void {
    edge.count += 1;
    dependency.dependencyTypes.forEach(type => edge.dependencyTypes.add(type));
    edge.allNonRuntime &&= dependency.typeOnly === true || dependency.preCompilationOnly === true;
    edge.allDynamic &&= dependency.dynamic === true;
    edge.circular ||= dependency.circular;
    edge.valid &&= dependency.valid;
}

function aggregateEdgeAttributes(edge: AggregatedEdge, edgeLabels: EdgeLabelsMode): string {
    const attributes: string[] = [];
    if (!edge.constrained) attributes.push('constraint="false"');
    const labelParts: string[] = [];
    if (edge.count > 1) labelParts.push(`×${edge.count}`);
    if (edgeLabels === 'types') labelParts.push(...[...edge.dependencyTypes].sort());
    if (labelParts.length > 0) attributes.push(`label=${dotQuote(labelParts.join(' · '))}`);
    if (edge.allNonRuntime) attributes.push('style="dashed"');
    if (edge.circular) attributes.push('color="#d97706"', 'penwidth="2"');
    if (!edge.valid) {
        if (edge.circular) attributes.push('xlabel="invalid"', 'fontcolor="#dc2626"');
        else attributes.push('color="#dc2626"', 'penwidth="2"');
    }
    return attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
}

function compactPairEdgeAttributes(edge: AggregatedEdge, edgeLabels: EdgeLabelsMode): string {
    const attributes: string[] = [];
    if (!edge.constrained) attributes.push('constraint="false"');
    if (edgeLabels === 'types' && edge.dependencyTypes.size > 0) {
        attributes.push(`label=${dotQuote([...edge.dependencyTypes].sort().join(', '))}`);
    }
    if (edge.allNonRuntime) {
        attributes.push('arrowhead="onormal"', 'style="dashed"', 'color="#aaaaaa"', 'penwidth="1"');
    } else if (edge.allDynamic) {
        attributes.push('style="dashed"');
    }
    if (edge.circular) attributes.push('color="#d97706"', 'penwidth="2"');
    if (!edge.valid) {
        if (edge.circular) attributes.push('xlabel="invalid"', 'fontcolor="#dc2626"');
        else attributes.push('color="#dc2626"', 'penwidth="2"');
    }
    return attributes.length > 0 ? ` [${attributes.join(', ')}]` : '';
}

/** Pure, deterministic conversion of a validated dependency-cruiser result to Graphviz DOT. */
export function renderDependencyGraphToDot(
    graph: MaritimeCruiseResult,
    options: GraphPresentationOptions = {},
    context: GraphRenderContext = {}
): string {
    const presentation = resolveGraphPresentation(options);
    const compactTheme = (options.graphProfile ?? DEFAULT_GRAPH_PROFILE) === 'compact-architecture';
    const root: DirectoryNode = { directories: new Map(), files: [] };
    const localSources = new Set<string>();
    const externalPackages = new Set<string>();

    for (const module of graph.modules) {
        const source = normalizedPath(module.source);
        if (isExternalPath(source) || module.coreModule) continue;
        localSources.add(source);
        if (presentation.moduleAggregation === 'folders') continue;
        if (presentation.folderGrouping === 'nested') addLocalModule(root, module, source);
        else if (presentation.folderGrouping === 'top-level') {
            const segments = source.split('/').filter(Boolean);
            const name = segments.at(-1);
            if (segments.length <= 1 || !name) {
                root.files.push(localFileFromModule(module, source));
                continue;
            }
            const [topLevel] = segments;
            const directory: DirectoryNode = root.directories.get(topLevel) ?? { directories: new Map(), files: [] };
            root.directories.set(topLevel, directory);
            directory.files.push(localFileFromModule(module, source));
        } else root.files.push(localFileFromModule(module, source));
    }

    if (presentation.moduleAggregation === 'folders') {
        const folders = [...new Set([...localSources].map(compactFolder))].sort();
        const aggregateEdges = new Map<string, AggregatedEdge>();
        for (const module of [...graph.modules].sort((a, b) => a.source.localeCompare(b.source))) {
            const source = normalizedPath(module.source);
            if (!localSources.has(source)) continue;
            const fromFolder = compactFolder(source);
            for (const dependency of module.dependencies) {
                const resolved = normalizedPath(dependency.resolved);
                let target: string | undefined;
                if (localSources.has(resolved)) {
                    const toFolder = compactFolder(resolved);
                    if (fromFolder === toFolder) continue;
                    target = `folder:${toFolder}`;
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
                if (!target) continue;
                const key = `${fromFolder}\0${target}`;
                const current = aggregateEdges.get(key);
                if (current) mergeAggregatedEdge(current, dependency);
                else aggregateEdges.set(key, {
                    from: `folder:${fromFolder}`, to: target, count: 1,
                    constrained: !localSources.has(resolved) || presentation.rankConstraints === 'all' || topLevelFolder(source) === topLevelFolder(resolved),
                    dependencyTypes: new Set(dependency.dependencyTypes),
                    allNonRuntime: dependency.typeOnly === true || dependency.preCompilationOnly === true,
                    allDynamic: dependency.dynamic === true,
                    circular: dependency.circular,
                    valid: dependency.valid
                });
            }
        }
        const lines = [
            'digraph "dependency-graph" {',
            `  graph [compound="true", newrank="true", rankdir="${presentation.layoutDirection.toUpperCase()}", fontname="Helvetica"${presentation.layoutDensity === 'compact' ? ', ranksep="0.12", nodesep="0.10"' : ''}];`,
            '  node [fontname="Helvetica", fontsize="10"];',
            '  edge [fontname="Helvetica", fontsize="8", color="#94a3b8"];',
            ...folders.map(folder => `  ${dotQuote(`folder:${folder}`)} [label=${dotQuote(folder)}, shape="folder"];`)
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
        for (const edge of [...aggregateEdges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
            lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${aggregateEdgeAttributes(edge, presentation.edgeLabels)};`);
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

    const graphAttributes = compactTheme
        ? `compound="true", rankdir="${presentation.layoutDirection.toUpperCase()}", splines="true", overlap="false", fontname="Helvetica-bold", fontsize="9", bgcolor="white"${presentation.layoutDensity === 'compact' ? ', ranksep="0.12", nodesep="0.10"' : ''}`
        : `compound="true", newrank="true", rankdir="${presentation.layoutDirection.toUpperCase()}", fontname="Helvetica"${presentation.layoutDensity === 'compact' ? ', ranksep="0.12", nodesep="0.10"' : ''}`;
    const lines = [
        'digraph "dependency-graph" {',
        `  graph [${graphAttributes}];`,
        compactTheme
            ? '  node [shape="box", style="rounded,filled", color="black", fillcolor="#ffffcc", fontcolor="black", fontname="Helvetica", fontsize="9", height="0.2"];'
            : '  node [fontname="Helvetica", fontsize="10"];',
        compactTheme
            ? '  edge [arrowhead="normal", arrowsize="0.6", penwidth="2", color="#00000033", fontname="Helvetica", fontsize="9"];'
            : '  edge [fontname="Helvetica", fontsize="8"];',
        ...renderLocalTree(root, graph, context, compactTheme)
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
    if (compactTheme) {
        const pairEdges = new Map<string, AggregatedEdge>();
        for (const edge of edges) {
            const key = `${edge.from}\0${edge.to}`;
            const current = pairEdges.get(key);
            if (current) {
                current.constrained &&= edge.constrained;
                mergeAggregatedEdge(current, edge.dependency);
            } else {
                pairEdges.set(key, {
                    from: edge.from,
                    to: edge.to,
                    count: 1,
                    constrained: edge.constrained,
                    dependencyTypes: new Set(edge.dependency.dependencyTypes),
                    allNonRuntime: edge.dependency.typeOnly === true || edge.dependency.preCompilationOnly === true,
                    allDynamic: edge.dependency.dynamic === true,
                    circular: edge.dependency.circular,
                    valid: edge.dependency.valid
                });
            }
        }
        for (const edge of [...pairEdges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
            lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${compactPairEdgeAttributes(edge, presentation.edgeLabels)};`);
        }
    } else {
        for (const edge of edges) {
            lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${edgeAttributes(edge.dependency, presentation.edgeLabels, edge.constrained)};`);
        }
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
