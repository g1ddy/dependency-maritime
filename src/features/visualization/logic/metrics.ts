import Graph from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank';
import { type ComplexityMetricsMap, type GroupNodeData } from '../types';

export const HEALTHY_THRESHOLD = 20;
export const UNHEALTHY_THRESHOLD = 50;

export function getHealthStatus(score: number): 'healthy' | 'warning' | 'unhealthy' {
  if (score > UNHEALTHY_THRESHOLD) {
    return 'unhealthy';
  } else if (score >= HEALTHY_THRESHOLD) {
    return 'warning';
  }
  return 'healthy';
}

interface FolderAggregation {
  count: number;
  totalInstability: number;
  totalCentrality: number;
  totalComplexity: number;
  totalLoc: number;
  totalCompoundScore: number;
}

/**
 * Calculates graph metrics for Phase 2: The Inspector.
 * - Instability: Ce / (Ca + Ce)
 * - Centrality: PageRank
 * - Complexity: Cyclomatic Complexity & LOC (from external source)
 *
 * Returns a map of aggregated metrics for folder nodes.
 */
export function calculateGraphMetrics(graph: Graph, complexityMetrics?: ComplexityMetricsMap | null): Record<string, GroupNodeData['metrics']> {
  // 1. Centrality (PageRank)
  // We run this first as it calculates for the whole graph
  const centralities = pagerank(graph);

  const folderAggregations = new Map<string, FolderAggregation>();

  // Helper to ensure folder entry exists
  const getFolderEntry = (path: string): FolderAggregation => {
    if (!folderAggregations.has(path)) {
      folderAggregations.set(path, {
        count: 0,
        totalInstability: 0,
        totalCentrality: 0,
        totalComplexity: 0,
        totalLoc: 0,
        totalCompoundScore: 0
      });
    }
    return folderAggregations.get(path)!;
  };

  const accumulateMetrics = (target: FolderAggregation, source: Partial<FolderAggregation>) => {
    target.count += source.count || 0;
    target.totalInstability += source.totalInstability || 0;
    target.totalCentrality += source.totalCentrality || 0;
    target.totalComplexity += source.totalComplexity || 0;
    target.totalLoc += source.totalLoc || 0;
    target.totalCompoundScore += source.totalCompoundScore || 0;
  };

  // 2. Iterate nodes to calculate Instability and assign all metrics
  graph.forEachNode((nodeId) => {
    // Fan-Out (Efferent Coupling - Ce): Dependencies (outgoing edges)
    const fanOut = graph.outDegree(nodeId);

    // Fan-In (Afferent Coupling - Ca): Dependents (incoming edges)
    const fanIn = graph.inDegree(nodeId);

    // Instability Calculation
    // I = Ce / (Ca + Ce)
    // Range: [0, 1]. 0 = Stable (many incoming), 1 = Unstable (many outgoing)
    let instability = 0;
    const totalCoupling = fanIn + fanOut;

    if (totalCoupling > 0) {
      instability = fanOut / totalCoupling;
    }

    // Retrieve Complexity Data if available
    // We use fullPath to look up metrics as nodeId is a GUID
    const fullPath = graph.getNodeAttribute(nodeId, 'fullPath') as string;

    let cyclomaticComplexity: number | undefined;
    let loc: number | undefined;

    if (complexityMetrics && fullPath && complexityMetrics[fullPath]) {
      cyclomaticComplexity = complexityMetrics[fullPath].complexity || 0;
      loc = complexityMetrics[fullPath].loc || 0;
    }

    // Compound Score Calculation
    // (LOC / 10) + (Complexity * 2) + (FanOut * 2) + (Instability * 20)
    const effectiveLoc = loc || 0;
    const effectiveComplexity = cyclomaticComplexity || 0;

    const rawScore = (effectiveLoc / 10) + (effectiveComplexity * 2) + (fanOut * 2) + (instability * 20);
    const compoundScore = Math.round(rawScore * 10) / 10;

    // Health Status
    const healthStatus = getHealthStatus(compoundScore);

    const centrality = centralities[nodeId] || 0;

    // Prepare Metrics Object
    const metrics = {
      instability: Math.round(instability * 100) / 100,
      centrality: Math.round(centrality * 10000) / 10000,
      cyclomaticComplexity,
      loc,
      compoundScore
    };

    // Update Graph Attributes
    // We preserve existing data and merge metrics
    graph.mergeNodeAttributes(nodeId, {
      metrics,
      healthStatus
    });

    // 3. Aggregate for Folders
    if (!fullPath) return;

    // We walk up the directory tree to attribute these metrics to all ancestors.
    const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    const lastSlash = normalizedPath.lastIndexOf('/');
    const parentPath = lastSlash !== -1 ? normalizedPath.substring(0, lastSlash) : '';

    if (parentPath) {
      const agg = getFolderEntry(parentPath);
      accumulateMetrics(agg, {
        count: 1,
        totalInstability: instability,
        totalCentrality: centrality,
        totalComplexity: effectiveComplexity,
        totalLoc: effectiveLoc,
        totalCompoundScore: compoundScore
      });
    }
  });

  // 3.5 Propagate Aggregations Up the Tree
  // We use a snapshot of the initial aggregations (which only contain file metrics)
  // to avoid double-counting as we walk up the tree. This is more efficient than
  // building a full path set and sorting, as it processes each file contribution independently.
  const initialEntries = Array.from(folderAggregations.entries()).map(([path, agg]) => [path, { ...agg }] as const);

  for (const [path, metrics] of initialEntries) {
    let currentPath = path;
    while (true) {
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash === -1) break;

      const parentPath = currentPath.substring(0, lastSlash);
      // Avoid creating an entry for empty string if path starts with /
      if (!parentPath) break;

      const parentAgg = getFolderEntry(parentPath);
      accumulateMetrics(parentAgg, metrics);

      currentPath = parentPath;
    }
  }

  // 4. Finalize Folder Metrics
  const folderMetrics: Record<string, GroupNodeData['metrics']> = {};

  folderAggregations.forEach((agg, path) => {
    if (agg.count === 0) return;

    folderMetrics[path] = {
      instability: Math.round((agg.totalInstability / agg.count) * 100) / 100,
      centrality: Math.round((agg.totalCentrality / agg.count) * 10000) / 10000,
      cyclomaticComplexity: agg.totalComplexity, // Sum
      loc: agg.totalLoc, // Sum
      compoundScore: Math.round((agg.totalCompoundScore / agg.count) * 10) / 10 // Avg
    };
  });

  return folderMetrics;
}
