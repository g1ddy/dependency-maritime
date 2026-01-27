import Graph from 'graphology';
import { type Node, type Edge } from '@xyflow/react';
import { type ICruiseResult, type IModule, type IDependency } from '../../../schema/dependency-cruiser';
import { classifyNode, type ModuleCategory } from './filters';

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
export function transformToReactFlow(
  graph: Graph,
  options: {
    hideTypeDefinitions?: boolean;
    activeFilters?: ModuleCategory[];
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visibleNodeIds = new Set<string>();
  const groupNodesMap = new Map<string, Node>();

  const activeFilters = options.activeFilters || [];

  graph.forEachNode((nodeId, attributes) => {
    // Apply Category Filter
    if (activeFilters.length > 0) {
      const category = classifyNode(nodeId);
      if (!activeFilters.includes(category)) {
        return; // Skip this node
      }
    }

    visibleNodeIds.add(nodeId);

    // Determine directory hierarchy
    // Assuming nodeId is a file path like "src/features/visualization/logic/transformer.ts"
    const parts = nodeId.split('/');
    parts.pop(); // Remove filename

    // Create/Find Group Nodes
    let parentId: string | undefined = undefined;

    if (parts.length > 0) {
      const dirPath = parts.join('/');
      parentId = dirPath;

      // Ensure all ancestor groups exist
      let currentPath = dirPath;
      while (currentPath) {
        if (!groupNodesMap.has(currentPath)) {
          const groupParts = currentPath.split('/');
          const label = groupParts[groupParts.length - 1];
          // Parent of this group
          groupParts.pop();
          const groupParentId = groupParts.length > 0 ? groupParts.join('/') : undefined;

          groupNodesMap.set(currentPath, {
            id: currentPath,
            type: 'groupNode',
            position: { x: 0, y: 0 },
            data: { label },
            parentId: groupParentId,
            style: { width: 100, height: 100 }, // Default size, Dagre will resize
          });
        } else {
          // If we found the group, we assume its ancestors are also created
          break;
        }

        // Move up one level
        const lastSlash = currentPath.lastIndexOf('/');
        if (lastSlash === -1) break;
        currentPath = currentPath.substring(0, lastSlash);
      }
    }

    nodes.push({
      id: nodeId,
      // We will assume a default type for now, or 'default'
      type: 'appNode',
      position: { x: 0, y: 0 }, // Layout will fix this
      parentId,
      data: {
        label: attributes.label,
        ...attributes
      },
    });
  });

  // Add group nodes to the nodes list
  nodes.push(...groupNodesMap.values());

  graph.forEachEdge((_edgeId, attributes, source, target) => {
    // 1. Filter out edges where source or target is hidden
    if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) {
      return;
    }

    // 2. Filter out type definitions if requested
    if (
      options.hideTypeDefinitions &&
      Array.isArray(attributes.dependencyTypes) &&
      attributes.dependencyTypes.includes('type-only')
    ) {
      return;
    }

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
