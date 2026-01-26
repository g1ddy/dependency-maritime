import Graph from 'graphology';
import { type Node, type Edge } from '@xyflow/react';
import { type ICruiseResult, type IModule, type IDependency } from '../../../schema/dependency-cruiser';

/**
 * Converts the dependency-cruiser output into a Graphology graph.
 * This acts as the "Headless" logic layer.
 */
export function createGraphFromCruiseResult(data: ICruiseResult): Graph {
  const graph = new Graph({ type: 'directed', allowSelfLoops: true, multi: false });

  // 1. Add all nodes
  data.modules.forEach((mod: IModule) => {
    // We use the source path as the unique ID
    if (!graph.hasNode(mod.source)) {
      graph.addNode(mod.source, {
        label: mod.source.split('/').pop(), // Simple filename as label
        fullPath: mod.source,
        ...mod
      });
    }
  });

  // 2. Add all edges
  data.modules.forEach((mod: IModule) => {
    mod.dependencies.forEach((dep: IDependency) => {
      // Ensure the target node exists (sometimes dep-cruiser reports resolved paths that aren't in the modules list?)
      // If it's an external module or core module, it might not be in 'modules' depending on config.
      // For now, we only add edges if both nodes exist to avoid errors.
      // Alternatively, we could add missing nodes as "external" nodes.

      const targetId = dep.resolved;

      if (!graph.hasNode(targetId)) {
        // Option: Auto-create external nodes?
        // Let's create them but mark them as external/unresolved
        graph.addNode(targetId, {
           label: targetId.split('/').pop(),
           fullPath: targetId,
           external: true,
           coreModule: dep.coreModule
        });
      }

      // Avoid duplicate edges if they already exist
      if (!graph.hasEdge(mod.source, targetId)) {
        graph.addEdge(mod.source, targetId, {
            ...dep
        });
      }
    });
  });

  return graph;
}

/**
 * Transforms a Graphology graph into React Flow primitives.
 * This function returns nodes with default (0,0) positions.
 * Layouting should be applied after this step.
 */
export function transformToReactFlow(graph: Graph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  graph.forEachNode((nodeId, attributes) => {
    nodes.push({
      id: nodeId,
      // We will assume a default type for now, or 'default'
      type: 'default',
      position: { x: 0, y: 0 }, // Layout will fix this
      data: {
        label: attributes.label,
        ...attributes
      },
    });
  });

  graph.forEachEdge((_edgeId, attributes, source, target) => {
    edges.push({
      id: `e-${source}-${target}`, // Stable edge ID
      source,
      target,
      // type: 'smoothstep', // Default edge type
      data: {
        ...attributes
      }
    });
  });

  return { nodes, edges };
}
