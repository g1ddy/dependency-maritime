import Graph from 'graphology';
import pagerank from 'graphology-metrics/centrality/pagerank';
import { type AppNodeData } from '../types';

/**
 * Calculates graph metrics for Phase 2: The Inspector.
 * - Instability: Ce / (Ca + Ce)
 * - Centrality: PageRank
 */
export async function calculateGraphMetrics(graph: Graph): Promise<void> {
  // 1. Centrality (PageRank)
  // We run this first as it calculates for the whole graph
  const centralities = pagerank(graph);

  // 2. Iterate nodes to calculate Instability and assign all metrics
  graph.forEachNode((nodeId, attributes) => {
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

    // Prepare Metrics Object
    const metrics = {
      instability: Number(instability.toFixed(2)),
      centrality: Number((centralities[nodeId] || 0).toFixed(4)),
      cyclomaticComplexity: 0 // Not available in current schema, placeholder.
    };

    // Update Graph Attributes
    // We preserve existing data and merge metrics
    const existingData = attributes as Partial<AppNodeData>;

    graph.mergeNodeAttributes(nodeId, {
      metrics,
      // We remove the debugColor simulation from the stub
    });
  });
}
