import Graph from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank';
import { type ComplexityMetricsMap } from '../types';

/**
 * Calculates graph metrics for Phase 2: The Inspector.
 * - Instability: Ce / (Ca + Ce)
 * - Centrality: PageRank
 * - Complexity: Cyclomatic Complexity & LOC (from external source)
 */
export function calculateGraphMetrics(graph: Graph, complexityMetrics?: ComplexityMetricsMap | null): void {
  // 1. Centrality (PageRank)
  // We run this first as it calculates for the whole graph
  const centralities = pagerank(graph);

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
    // The nodeId (file path) should match the keys in complexityMetrics
    let cyclomaticComplexity: number | undefined;
    let loc: number | undefined;

    if (complexityMetrics && complexityMetrics[nodeId]) {
      cyclomaticComplexity = complexityMetrics[nodeId].complexity || 0;
      loc = complexityMetrics[nodeId].loc || 0;
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

    // Prepare Metrics Object
    const metrics = {
      instability: Math.round(instability * 100) / 100,
      centrality: Math.round((centralities[nodeId] || 0) * 10000) / 10000,
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
  });
}
