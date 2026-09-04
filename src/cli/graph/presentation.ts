export const EXTERNAL_PACKAGE_MODES = ['none', 'summary', 'direct'] as const;
export const FOLDER_GROUPING_MODES = ['none', 'top-level', 'nested'] as const;
export const EDGE_LABEL_MODES = ['none', 'types'] as const;
export const LAYOUT_DIRECTION_MODES = ['lr', 'tb'] as const;
export const RANK_CONSTRAINT_MODES = ['all', 'intra-folder'] as const;
export const LAYOUT_DENSITY_MODES = ['normal', 'compact'] as const;
export const MODULE_AGGREGATION_MODES = ['none', 'folders'] as const;
export const VISUAL_THEME_MODES = ['standard', 'architecture'] as const;
export const SOURCE_ROOT_GROUPING_MODES = ['preserve', 'elide-single'] as const;
export const EDGE_PRESENTATION_MODES = ['relations', 'semantic-pairs'] as const;
export const CLUSTER_RANKING_MODES = ['global', 'local'] as const;
export const GRAPH_PROFILE_MODES = ['default', 'local-architecture', 'compact-architecture', 'architecture-overview'] as const;

export type ExternalPackagesMode = typeof EXTERNAL_PACKAGE_MODES[number];
export type FolderGroupingMode = typeof FOLDER_GROUPING_MODES[number];
export type EdgeLabelsMode = typeof EDGE_LABEL_MODES[number];
export type LayoutDirectionMode = typeof LAYOUT_DIRECTION_MODES[number];
export type RankConstraintMode = typeof RANK_CONSTRAINT_MODES[number];
export type LayoutDensityMode = typeof LAYOUT_DENSITY_MODES[number];
export type ModuleAggregationMode = typeof MODULE_AGGREGATION_MODES[number];
export type VisualThemeMode = typeof VISUAL_THEME_MODES[number];
export type SourceRootGroupingMode = typeof SOURCE_ROOT_GROUPING_MODES[number];
export type EdgePresentationMode = typeof EDGE_PRESENTATION_MODES[number];
export type ClusterRankingMode = typeof CLUSTER_RANKING_MODES[number];
export type GraphProfileMode = typeof GRAPH_PROFILE_MODES[number];

export type GraphPresentationOptions = {
    externalPackages?: ExternalPackagesMode;
    folderGrouping?: FolderGroupingMode;
    edgeLabels?: EdgeLabelsMode;
    layoutDirection?: LayoutDirectionMode;
    rankConstraints?: RankConstraintMode;
    layoutDensity?: LayoutDensityMode;
    moduleAggregation?: ModuleAggregationMode;
    visualTheme?: VisualThemeMode;
    sourceRootGrouping?: SourceRootGroupingMode;
    edgePresentation?: EdgePresentationMode;
    clusterRanking?: ClusterRankingMode;
    aggregationDepth?: number;
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
    moduleAggregation: 'none',
    visualTheme: 'standard',
    sourceRootGrouping: 'preserve',
    edgePresentation: 'relations',
    clusterRanking: 'global',
    aggregationDepth: 2
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
        moduleAggregation: 'none',
        visualTheme: 'standard',
        sourceRootGrouping: 'preserve',
        edgePresentation: 'relations',
        clusterRanking: 'global',
        aggregationDepth: 2
    },
    'compact-architecture': {
        externalPackages: 'none',
        folderGrouping: 'nested',
        edgeLabels: 'none',
        layoutDirection: 'lr',
        rankConstraints: 'all',
        layoutDensity: 'compact',
        moduleAggregation: 'none',
        visualTheme: 'architecture',
        sourceRootGrouping: 'elide-single',
        edgePresentation: 'semantic-pairs',
        clusterRanking: 'local',
        aggregationDepth: 2
    },
    'architecture-overview': {
        externalPackages: 'none',
        folderGrouping: 'nested',
        edgeLabels: 'none',
        layoutDirection: 'lr',
        rankConstraints: 'all',
        layoutDensity: 'normal',
        moduleAggregation: 'folders',
        visualTheme: 'architecture',
        sourceRootGrouping: 'preserve',
        edgePresentation: 'semantic-pairs',
        clusterRanking: 'global',
        aggregationDepth: 2
    }
} as const satisfies Record<GraphProfileMode, ResolvedGraphPresentation>;

/** Applies a profile first, then explicit presentation settings as deterministic overrides. */
export function resolveGraphPresentation(options: GraphPresentationOptions = {}): ResolvedGraphPresentation {
    const profile = GRAPH_PRESENTATION_PROFILES[options.graphProfile ?? DEFAULT_GRAPH_PROFILE];
    const aggregationDepth = options.aggregationDepth ?? profile.aggregationDepth;
    if (!Number.isInteger(aggregationDepth) || aggregationDepth < 1) {
        throw new Error(`Invalid aggregationDepth "${aggregationDepth}". Expected a positive integer.`);
    }
    return {
        externalPackages: options.externalPackages ?? profile.externalPackages,
        folderGrouping: options.folderGrouping ?? profile.folderGrouping,
        edgeLabels: options.edgeLabels ?? profile.edgeLabels,
        layoutDirection: options.layoutDirection ?? profile.layoutDirection,
        rankConstraints: options.rankConstraints ?? profile.rankConstraints,
        layoutDensity: options.layoutDensity ?? profile.layoutDensity,
        moduleAggregation: options.moduleAggregation ?? profile.moduleAggregation,
        visualTheme: options.visualTheme ?? profile.visualTheme,
        sourceRootGrouping: options.sourceRootGrouping ?? profile.sourceRootGrouping,
        edgePresentation: options.edgePresentation ?? profile.edgePresentation,
        clusterRanking: options.clusterRanking ?? profile.clusterRanking,
        aggregationDepth
    };
}
