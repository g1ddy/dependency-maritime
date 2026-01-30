import Graph from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank';
import { type ComplexityMetricsMap, type GroupNodeData } from '../types';

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
    let healthStatus: 'healthy' | 'warning' | 'unhealthy' = 'healthy';
    if (compoundScore > 50) {
      healthStatus = 'unhealthy';
    } else if (compoundScore >= 20) {
      healthStatus = 'warning';
    }

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
    const parts = fullPath.split('/');
    parts.pop(); // Remove filename

    // Iterate all parent directories
    let currentPath = parts.join('/');
    while (currentPath) {
       const agg = getFolderEntry(currentPath);
       agg.count += 1;
       agg.totalInstability += instability;
       agg.totalCentrality += centrality;
       agg.totalComplexity += effectiveComplexity;
       agg.totalLoc += effectiveLoc;
       agg.totalCompoundScore += compoundScore;

       // Move up
       const lastSlash = currentPath.lastIndexOf('/');
       if (lastSlash === -1) break;
       currentPath = currentPath.substring(0, lastSlash);
    }
  });

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
