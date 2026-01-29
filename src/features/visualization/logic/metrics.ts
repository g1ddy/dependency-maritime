import Graph from 'graphology';
import { type AppNodeData } from '../types';

/**
 * Calculates graph metrics for Phase 2.
 * Currently simulates a heavy calculation and assigns a random debug color.
 */
export async function calculateGraphMetrics(graph: Graph): Promise<void> {
  // Simulate heavy computation time
  await new Promise((resolve) => setTimeout(resolve, 800));

  graph.forEachNode((nodeId, attributes) => {
    // 1. Generate Random Debug Color
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    // 2. Assign to Node Attributes (Mutates the Graphology instance directly)
    graph.setNodeAttribute(nodeId, 'debugColor', randomColor);

    // 3. Placeholder for future metrics
    // Cast attributes to AppNodeData to avoid unsafe any access, assuming attributes match our schema
    const data = attributes as Partial<AppNodeData>;
    const existingMetrics = data.metrics || {};

    graph.setNodeAttribute(nodeId, 'metrics', {
      ...existingMetrics,
      instability: Math.random(), // Placeholder
      centrality: 0,
      cyclomaticComplexity: 0
    });
  });
}
