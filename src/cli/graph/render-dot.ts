import * as path from 'node:path';
import type { MaritimeCruiseResult, MaritimeDependency, MaritimeModule } from '../../schema/dependency-cruiser';
import {
    resolveGraphPresentation,
    type EdgeLabelsMode,
    type GraphPresentationOptions,
    type ResolvedGraphPresentation,
    type SourceRootGroupingMode,
    type VisualThemeMode
} from './presentation';

export * from './presentation';

type LocalFile = {
    source: string;
    name: string;
    orphan?: boolean;
};

type DirectoryNode = {
    directories: Map<string, DirectoryNode>;
    files: LocalFile[];
};

export type GraphRenderContext = {
    sourceRoots?: string[];
};

const TYPE_ONLY_DEPENDENCY_TYPES = new Set([
    'pre-compilation-only',
    'triple-slash-type-reference',
    'type-import',
    'type-only'
]);

const dotQuote = (value: string): string => JSON.stringify(value);
const normalizedPath = (value: string): string => value
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

const pathSegments = (value: string): string[] => {
    const normalized = normalizedPath(value);
    if (normalized === '.' || normalized === '') return [];
    return normalized.split('/').filter(Boolean);
};

function dependencyIsNonRuntime(dependency: MaritimeDependency): boolean {
    return dependency.typeOnly === true
        || dependency.preCompilationOnly === true
        || dependency.dependencyTypes.some(type => TYPE_ONLY_DEPENDENCY_TYPES.has(type));
}

function externalPackageName(value: string): string | undefined {
    const normalized = normalizedPath(value);
    const marker = 'node_modules/';
    const markerIndex = normalized.lastIndexOf(marker);
    const packagePath = markerIndex >= 0 ? normalized.slice(markerIndex + marker.length) : normalized;
    const parts = packagePath.split('/').filter(Boolean);

    if (markerIndex < 0 && (packagePath.startsWith('.') || packagePath.startsWith('/') || parts.length === 0)) {
        return undefined;
    }

    return parts[0]?.startsWith('@') && parts[1]
        ? `${parts[0]}/${parts[1]}`
        : parts[0];
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

function createDirectoryTree(): DirectoryNode {
    return {
        directories: new Map(),
        files: []
    };
}

function addFileToTree(root: DirectoryNode, file: LocalFile, directorySegments: string[]): void {
    let directory = root;

    for (const part of directorySegments) {
        let child = directory.directories.get(part);
        if (!child) {
            child = createDirectoryTree();
            directory.directories.set(part, child);
        }
        directory = child;
    }

    directory.files.push(file);
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

function renderFileNode(file: LocalFile, indent: string, visualTheme: VisualThemeMode): string {
    if (visualTheme === 'architecture') {
        return `${indent}${dotQuote(`local:${file.source}`)} [label=${dotQuote(file.name)}, shape="box", style="rounded,filled", color="black", fillcolor=${dotQuote(nodeFillColor(file))}, fontcolor="black", fontname="Helvetica", fontsize="9", height="0.2", margin="0.06,0.035"];`;
    }

    return `${indent}${dotQuote(`local:${file.source}`)} [label=${dotQuote(file.name)}, shape="box"];`;
}

function clusterAttributes(indent: string, visualTheme: VisualThemeMode): string[] {
    if (visualTheme !== 'architecture') {
        return [`${indent}color="#94a3b8";`];
    }

    return [
        `${indent}color="black";`,
        `${indent}fontcolor="black";`,
        `${indent}fontname="Helvetica-Bold";`,
        `${indent}fontsize="9";`,
        `${indent}penwidth="2";`,
        `${indent}margin="4";`,
        `${indent}style="rounded,bold,filled";`,
        `${indent}fillcolor="#ffffff";`
    ];
}

function renderDirectoryContents(
    directory: DirectoryNode,
    segments: string[],
    indent: string,
    visualTheme: VisualThemeMode
): string[] {
    const lines: string[] = [];

    for (const [name, child] of [...directory.directories].sort(([a], [b]) => a.localeCompare(b))) {
        const childSegments = [...segments, name];
        lines.push(`${indent}subgraph ${dotQuote(`cluster:${childSegments.join('/')}`)} {`);
        lines.push(`${indent}  label=${dotQuote(name)};`);
        lines.push(...clusterAttributes(`${indent}  `, visualTheme));
        lines.push(...renderDirectoryContents(child, childSegments, `${indent}  `, visualTheme));
        lines.push(`${indent}}`);
    }

    for (const file of [...directory.files].sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source))) {
        lines.push(renderFileNode(file, indent, visualTheme));
    }

    return lines;
}

function normalizedSourceRoots(sourceRoots: string[] | undefined): string[] | undefined {
    if (!sourceRoots) return undefined;

    const roots = [...new Set(
        sourceRoots
            .map(normalizedPath)
            .filter(root => root.length > 0)
    )];

    return roots.length > 0 ? roots : undefined;
}

function inferSourceRoots(graph: MaritimeCruiseResult): string[] | undefined {
    const optionsUsed = graph.summary.optionsUsed;
    if (!optionsUsed || typeof optionsUsed !== 'object') return undefined;

    const args = (optionsUsed as { args?: unknown }).args;
    if (Array.isArray(args)) {
        return normalizedSourceRoots(
            args.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        );
    }

    if (typeof args === 'string') {
        return normalizedSourceRoots(
            args.split(/[\s,]+/u).map(value => value.trim()).filter(Boolean)
        );
    }

    return undefined;
}

function hasPrefix(segments: string[], prefix: string[]): boolean {
    return prefix.length <= segments.length
        && prefix.every((part, index) => segments[index] === part);
}

function matchingSourceRoot(source: string, sourceRoots: string[] | undefined): string | undefined {
    if (!sourceRoots) return undefined;

    const directories = pathSegments(source);
    directories.pop();

    return [...sourceRoots]
        .sort((a, b) => pathSegments(b).length - pathSegments(a).length || a.localeCompare(b))
        .find(root => hasPrefix(directories, pathSegments(root)));
}

function filesByRoot(
    files: LocalFile[],
    sourceRoots: string[]
): { byRoot: Map<string, LocalFile[]>; unmatched: LocalFile[] } {
    const byRoot = new Map(sourceRoots.map(root => [root, [] as LocalFile[]]));
    const unmatched: LocalFile[] = [];

    for (const file of files) {
        const root = matchingSourceRoot(file.source, sourceRoots);
        if (root !== undefined) {
            byRoot.get(root)?.push(file);
        } else {
            unmatched.push(file);
        }
    }

    return { byRoot, unmatched };
}

function buildTree(files: LocalFile[], stripPrefix: string[] = []): DirectoryNode {
    const tree = createDirectoryTree();

    for (const file of files) {
        const directories = pathSegments(file.source);
        directories.pop();
        const relative = hasPrefix(directories, stripPrefix)
            ? directories.slice(stripPrefix.length)
            : directories;
        addFileToTree(tree, file, relative);
    }

    return tree;
}

function renderRootCluster(
    rootPath: string,
    files: LocalFile[],
    indent: string,
    visualTheme: VisualThemeMode
): string[] {
    const rootSegments = pathSegments(rootPath);
    const tree = buildTree(files, rootSegments);
    const label = rootSegments.at(-1) ?? rootPath;

    return [
        `${indent}subgraph ${dotQuote(`cluster:${rootPath}`)} {`,
        `${indent}  label=${dotQuote(label)};`,
        ...clusterAttributes(`${indent}  `, visualTheme),
        ...renderDirectoryContents(tree, rootSegments, `${indent}  `, visualTheme),
        `${indent}}`
    ];
}

function renderNestedFiles(
    files: LocalFile[],
    sourceRoots: string[] | undefined,
    sourceRootGrouping: SourceRootGroupingMode,
    visualTheme: VisualThemeMode
): string[] {
    if (!sourceRoots || sourceRoots.length === 0) {
        return renderDirectoryContents(buildTree(files), [], '  ', visualTheme);
    }

    const { byRoot, unmatched } = filesByRoot(files, sourceRoots);
    const lines: string[] = [];

    if (sourceRoots.length === 1 && sourceRootGrouping === 'elide-single') {
        const sourceRoot = sourceRoots[0];
        const rootFiles = byRoot.get(sourceRoot) ?? [];
        const rootSegments = pathSegments(sourceRoot);
        lines.push(...renderDirectoryContents(
            buildTree(rootFiles, rootSegments),
            rootSegments,
            '  ',
            visualTheme
        ));
    } else {
        for (const sourceRoot of [...sourceRoots].sort()) {
            const rootFiles = byRoot.get(sourceRoot) ?? [];
            if (rootFiles.length > 0) {
                lines.push(...renderRootCluster(sourceRoot, rootFiles, '  ', visualTheme));
            }
        }
    }

    if (unmatched.length > 0) {
        lines.push(...renderDirectoryContents(buildTree(unmatched), [], '  ', visualTheme));
    }

    return lines;
}

function topLevelGroupForFile(
    file: LocalFile,
    sourceRoots: string[] | undefined,
    sourceRootGrouping: SourceRootGroupingMode
): string | undefined {
    const directories = pathSegments(file.source);
    directories.pop();
    const matchingRoot = matchingSourceRoot(file.source, sourceRoots);

    if (matchingRoot !== undefined) {
        const rootSegments = pathSegments(matchingRoot);
        if (sourceRoots?.length === 1 && sourceRootGrouping === 'elide-single') {
            return directories[rootSegments.length]
                ? [...rootSegments, directories[rootSegments.length]].join('/')
                : undefined;
        }
        return matchingRoot;
    }

    return directories[0];
}

function renderTopLevelFiles(
    files: LocalFile[],
    sourceRoots: string[] | undefined,
    sourceRootGrouping: SourceRootGroupingMode,
    visualTheme: VisualThemeMode
): string[] {
    const groups = new Map<string, LocalFile[]>();
    const ungrouped: LocalFile[] = [];

    for (const file of files) {
        const group = topLevelGroupForFile(file, sourceRoots, sourceRootGrouping);
        if (!group) {
            ungrouped.push(file);
        } else {
            groups.set(group, [...(groups.get(group) ?? []), file]);
        }
    }

    const lines: string[] = [];
    for (const [group, groupFiles] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push(`  subgraph ${dotQuote(`cluster:${group}`)} {`);
        lines.push(`    label=${dotQuote(path.posix.basename(group))};`);
        lines.push(...clusterAttributes('    ', visualTheme));
        for (const file of [...groupFiles].sort((a, b) => a.source.localeCompare(b.source))) {
            lines.push(renderFileNode(file, '    ', visualTheme));
        }
        lines.push('  }');
    }

    for (const file of [...ungrouped].sort((a, b) => a.source.localeCompare(b.source))) {
        lines.push(renderFileNode(file, '  ', visualTheme));
    }

    return lines;
}

function renderLocalFiles(
    files: LocalFile[],
    sourceRoots: string[] | undefined,
    presentation: ResolvedGraphPresentation
): string[] {
    if (presentation.folderGrouping === 'none') {
        return [...files]
            .sort((a, b) => a.source.localeCompare(b.source))
            .map(file => renderFileNode(file, '  ', presentation.visualTheme));
    }

    if (presentation.folderGrouping === 'top-level') {
        return renderTopLevelFiles(
            files,
            sourceRoots,
            presentation.sourceRootGrouping,
            presentation.visualTheme
        );
    }

    return renderNestedFiles(
        files,
        sourceRoots,
        presentation.sourceRootGrouping,
        presentation.visualTheme
    );
}

/** Backward-compatible fixed-depth helper. New rendering uses aggregationDepth relative to source roots. */
export function compactFolder(source: string): string {
    return aggregationFolder(source, undefined, 2, 'preserve');
}

export function aggregationFolder(
    source: string,
    sourceRoots: string[] | undefined,
    depth: number,
    sourceRootGrouping: SourceRootGroupingMode = 'preserve'
): string {
    if (!Number.isInteger(depth) || depth < 1) {
        throw new Error(`Invalid aggregation depth "${depth}". Expected a positive integer.`);
    }

    const directories = pathSegments(source);
    directories.pop();
    const roots = normalizedSourceRoots(sourceRoots);
    const matchingRoot = matchingSourceRoot(source, roots);

    if (matchingRoot !== undefined) {
        const rootSegments = pathSegments(matchingRoot);
        const selected = directories.slice(rootSegments.length, rootSegments.length + depth);

        if (roots?.length === 1 && sourceRootGrouping === 'elide-single') {
            return selected.join('/') || '.';
        }

        return [...rootSegments, ...selected].join('/') || matchingRoot;
    }

    return directories.slice(0, depth + 1).join('/') || '.';
}

function topLevelFolder(source: string): string {
    const segments = pathSegments(source);
    segments.pop();
    return segments[0] ?? '.';
}

function edgeAttributes(
    dependency: MaritimeDependency,
    edgeLabels: EdgeLabelsMode,
    constrained: boolean
): string {
    const attributes: string[] = [];
    if (!constrained) attributes.push('constraint="false"');

    const dependencyTypes = [...dependency.dependencyTypes].sort();
    if (edgeLabels === 'types' && dependencyTypes.length > 0) {
        attributes.push(`label=${dotQuote(dependencyTypes.join(', '))}`);
    }
    if (dependencyIsNonRuntime(dependency)) attributes.push('style="dashed"');
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

function createAggregatedEdge(
    from: string,
    to: string,
    dependency: MaritimeDependency,
    constrained: boolean
): AggregatedEdge {
    return {
        from,
        to,
        count: 1,
        constrained,
        dependencyTypes: new Set(dependency.dependencyTypes),
        allNonRuntime: dependencyIsNonRuntime(dependency),
        allDynamic: dependency.dynamic === true,
        circular: dependency.circular,
        valid: dependency.valid
    };
}

function mergeAggregatedEdge(
    edge: AggregatedEdge,
    dependency: MaritimeDependency,
    constrained = edge.constrained
): void {
    edge.count += 1;
    edge.constrained &&= constrained;
    dependency.dependencyTypes.forEach(type => edge.dependencyTypes.add(type));
    edge.allNonRuntime &&= dependencyIsNonRuntime(dependency);
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

function semanticPairEdgeAttributes(
    edge: AggregatedEdge,
    edgeLabels: EdgeLabelsMode,
    includeCount: boolean
): string {
    const attributes: string[] = [];
    if (!edge.constrained) attributes.push('constraint="false"');

    const labelParts: string[] = [];
    if (includeCount && edge.count > 1) labelParts.push(`×${edge.count}`);
    if (edgeLabels === 'types') labelParts.push(...[...edge.dependencyTypes].sort());
    if (labelParts.length > 0) attributes.push(`label=${dotQuote(labelParts.join(' · '))}`);

    if (edge.allNonRuntime) {
        attributes.push(
            'arrowhead="onormal"',
            'style="dashed"',
            'color="#aaaaaa"',
            'penwidth="1"'
        );
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

function graphAttributes(presentation: ResolvedGraphPresentation): string {
    const attributes: Array<string | undefined> = [
        'compound="true"',
        presentation.clusterRanking === 'global' ? 'newrank="true"' : undefined,
        `rankdir="${presentation.layoutDirection.toUpperCase()}"`,
        presentation.outputOrder === 'edges-first'
            ? 'outputorder="edgesfirst"'
            : presentation.outputOrder === 'nodes-first'
                ? 'outputorder="nodesfirst"'
                : undefined
    ];

    if (presentation.visualTheme === 'architecture') {
        attributes.push(
            'splines="true"',
            'overlap="false"',
            'fontname="Helvetica-bold"',
            'fontsize="9"',
            'bgcolor="white"'
        );
    } else {
        attributes.push('fontname="Helvetica"');
    }

    if (presentation.layoutDensity === 'compact') {
        attributes.push('ranksep="0.12"', 'nodesep="0.10"');
    }

    return attributes.filter((value): value is string => value !== undefined).join(', ');
}

function nodeDefaults(presentation: ResolvedGraphPresentation): string {
    if (presentation.visualTheme === 'architecture') {
        return '  node [shape="box", style="rounded,filled", color="black", fillcolor="#ffffcc", fontcolor="black", fontname="Helvetica", fontsize="9", height="0.2"];';
    }

    return '  node [fontname="Helvetica", fontsize="10"];';
}

function edgeDefaults(presentation: ResolvedGraphPresentation): string {
    if (presentation.edgePresentation === 'semantic-pairs') {
        return '  edge [arrowhead="normal", arrowsize="0.6", penwidth="2", color="#00000033", fontname="Helvetica", fontsize="9"];';
    }

    return '  edge [fontname="Helvetica", fontsize="8"];';
}

function aggregatedFolderNode(folder: string, presentation: ResolvedGraphPresentation): string {
    if (presentation.visualTheme === 'architecture') {
        return `  ${dotQuote(`folder:${folder}`)} [label=${dotQuote(folder)}, shape="folder", style="filled,bold", fillcolor="#ffffff", color="black", penwidth="2", fontname="Helvetica-Bold", fontsize="9"];`;
    }

    return `  ${dotQuote(`folder:${folder}`)} [label=${dotQuote(folder)}, shape="folder"];`;
}

function appendExternalNodes(
    lines: string[],
    externalPackages: Set<string>,
    presentation: ResolvedGraphPresentation
): void {
    if (presentation.externalPackages === 'summary' && externalPackages.size > 0) {
        lines.push('  "external:boundary" [label="External packages", shape="component", style="filled,dashed", fillcolor="#e2e8f0", color="#64748b"];');
        return;
    }

    if (presentation.externalPackages === 'direct' && externalPackages.size > 0) {
        lines.push(
            '  subgraph "cluster:external-packages" {',
            '    label="External packages";',
            '    style="dashed";',
            '    color="#64748b";'
        );
        for (const packageName of [...externalPackages].sort()) {
            lines.push(`    ${dotQuote(`external:${packageName}`)} [label=${dotQuote(packageName)}, shape="component", style="filled", fillcolor="#e2e8f0"];`);
        }
        lines.push('  }');
    }
}

function dependencyTarget(
    dependency: MaritimeDependency,
    localSources: Set<string>,
    externalPackages: Set<string>,
    presentation: ResolvedGraphPresentation
): { resolved: string; target?: string } {
    const resolved = normalizedPath(dependency.resolved);
    if (localSources.has(resolved)) {
        return { resolved, target: `local:${resolved}` };
    }

    if (dependency.coreModule) return { resolved };

    const looksExternal = isExternalPath(resolved) || dependency.dependencyTypes.includes('npm');
    const packageName = looksExternal
        ? externalPackageName(isExternalPath(resolved) ? resolved : dependency.module)
        : undefined;

    if (!packageName || presentation.externalPackages === 'none') return { resolved };

    externalPackages.add(packageName);
    return {
        resolved,
        target: presentation.externalPackages === 'summary'
            ? 'external:boundary'
            : `external:${packageName}`
    };
}

/** Pure, deterministic conversion of a validated dependency-cruiser result to Graphviz DOT. */
export function renderDependencyGraphToDot(
    graph: MaritimeCruiseResult,
    options: GraphPresentationOptions = {},
    context: GraphRenderContext = {}
): string {
    const presentation = resolveGraphPresentation(options);
    const sourceRoots = normalizedSourceRoots(context.sourceRoots) ?? inferSourceRoots(graph);
    const localFiles: LocalFile[] = [];
    const localSources = new Set<string>();
    const externalPackages = new Set<string>();

    for (const module of graph.modules) {
        const source = normalizedPath(module.source);
        if (isExternalPath(source) || module.coreModule) continue;
        localSources.add(source);
        localFiles.push(localFileFromModule(module, source));
    }

    if (presentation.moduleAggregation === 'folders') {
        const folderFor = (source: string): string => aggregationFolder(
            source,
            sourceRoots,
            presentation.aggregationDepth,
            presentation.sourceRootGrouping
        );
        const folders = [...new Set([...localSources].map(folderFor))].sort();
        const aggregateEdges = new Map<string, AggregatedEdge>();

        for (const module of [...graph.modules].sort((a, b) => a.source.localeCompare(b.source))) {
            const source = normalizedPath(module.source);
            if (!localSources.has(source)) continue;
            const fromFolder = folderFor(source);

            for (const dependency of module.dependencies) {
                const resolved = normalizedPath(dependency.resolved);
                let target: string | undefined;

                if (localSources.has(resolved)) {
                    const toFolder = folderFor(resolved);
                    if (fromFolder === toFolder) continue;
                    target = `folder:${toFolder}`;
                } else if (!dependency.coreModule) {
                    const looksExternal = isExternalPath(resolved) || dependency.dependencyTypes.includes('npm');
                    const packageName = looksExternal
                        ? externalPackageName(isExternalPath(resolved) ? resolved : dependency.module)
                        : undefined;

                    if (packageName && presentation.externalPackages !== 'none') {
                        externalPackages.add(packageName);
                        target = presentation.externalPackages === 'summary'
                            ? 'external:boundary'
                            : `external:${packageName}`;
                    }
                }

                if (!target) continue;

                const from = `folder:${fromFolder}`;
                const constrained = !localSources.has(resolved)
                    || presentation.rankConstraints === 'all'
                    || topLevelFolder(source) === topLevelFolder(resolved);
                const key = `${from}\0${target}`;
                const current = aggregateEdges.get(key);

                if (current) {
                    mergeAggregatedEdge(current, dependency, constrained);
                } else {
                    aggregateEdges.set(
                        key,
                        createAggregatedEdge(from, target, dependency, constrained)
                    );
                }
            }
        }

        const lines = [
            'digraph "dependency-graph" {',
            `  graph [${graphAttributes(presentation)}];`,
            nodeDefaults(presentation),
            edgeDefaults(presentation),
            ...folders.map(folder => aggregatedFolderNode(folder, presentation))
        ];

        appendExternalNodes(lines, externalPackages, presentation);

        for (const edge of [...aggregateEdges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
            const attributes = presentation.edgePresentation === 'semantic-pairs'
                ? semanticPairEdgeAttributes(edge, presentation.edgeLabels, true)
                : aggregateEdgeAttributes(edge, presentation.edgeLabels);
            lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${attributes};`);
        }

        lines.push('}', '');
        return lines.join('\n');
    }

    const edges: Array<{
        from: string;
        to: string;
        dependency: MaritimeDependency;
        constrained: boolean;
    }> = [];

    for (const module of [...graph.modules].sort((a, b) => a.source.localeCompare(b.source))) {
        const source = normalizedPath(module.source);
        if (!localSources.has(source)) continue;

        for (const dependency of module.dependencies) {
            const { resolved, target } = dependencyTarget(
                dependency,
                localSources,
                externalPackages,
                presentation
            );
            if (!target) continue;

            const constrained = !localSources.has(resolved)
                || presentation.rankConstraints === 'all'
                || topLevelFolder(source) === topLevelFolder(resolved);
            edges.push({
                from: `local:${source}`,
                to: target,
                dependency,
                constrained
            });
        }
    }

    edges.sort((a, b) => a.from.localeCompare(b.from)
        || a.to.localeCompare(b.to)
        || JSON.stringify(a.dependency).localeCompare(JSON.stringify(b.dependency)));

    const lines = [
        'digraph "dependency-graph" {',
        `  graph [${graphAttributes(presentation)}];`,
        nodeDefaults(presentation),
        edgeDefaults(presentation),
        ...renderLocalFiles(localFiles, sourceRoots, presentation)
    ];

    appendExternalNodes(lines, externalPackages, presentation);

    if (presentation.edgePresentation === 'semantic-pairs') {
        const pairEdges = new Map<string, AggregatedEdge>();
        for (const edge of edges) {
            const key = `${edge.from}\0${edge.to}`;
            const current = pairEdges.get(key);
            if (current) {
                mergeAggregatedEdge(current, edge.dependency, edge.constrained);
            } else {
                pairEdges.set(
                    key,
                    createAggregatedEdge(edge.from, edge.to, edge.dependency, edge.constrained)
                );
            }
        }

        for (const edge of [...pairEdges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))) {
            lines.push(`  ${dotQuote(edge.from)} -> ${dotQuote(edge.to)}${semanticPairEdgeAttributes(edge, presentation.edgeLabels, false)};`);
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
