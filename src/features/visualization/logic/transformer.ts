import Graph from 'graphology';
import { type Node, type Edge } from '@xyflow/react';
import { type ICruiseResult, type IModule, type IDependency } from '../../../schema/dependency-cruiser';
import { classifyNode, type ModuleCategory } from './filters';

// Simple UUID generator for browser/node compatibility
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Converts the dependency-cruiser output into a Graphology graph.
 * This acts as the "Headless" logic layer.
 */
export function createGraphFromCruiseResult(data: ICruiseResult): Graph {
  const graph = new Graph({ type: 'directed', allowSelfLoops: true, multi: false });
  const pathMap = new Map<string, string>(); // Maps original file path -> Node GUID

  // 1. Add all nodes
  data.modules.forEach((mod: IModule) => {
    // We use a GUID as the unique ID for file nodes
    if (!pathMap.has(mod.source)) {
      const guid = generateUUID();
      pathMap.set(mod.source, guid);

      graph.addNode(guid, {
        label: mod.source.split('/').pop(), // Simple filename as label
        fullPath: mod.source, // Store the original path
        ...mod
      });
    }
  });

  // 2. Add all edges
  data.modules.forEach((mod: IModule) => {
    mod.dependencies.forEach((dep: IDependency) => {
      // Ensure the target node exists
      const sourceId = pathMap.get(mod.source);
      let targetId = pathMap.get(dep.resolved);

      if (!targetId) {
        // If target is external or missing from 'modules', create it
        targetId = generateUUID();
        pathMap.set(dep.resolved, targetId);

        graph.addNode(targetId, {
           label: dep.resolved.split('/').pop(),
           fullPath: dep.resolved,
           external: true,
           coreModule: dep.coreModule
        });
      }

      if (sourceId && targetId && !graph.hasEdge(sourceId, targetId)) {
        graph.addEdge(sourceId, targetId, {
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
    // attributes.fullPath should be something like "src/features/visualization/logic/transformer.ts"
    const fullPath = (attributes.fullPath as string) || '';

    // Apply Category Filter
    if (activeFilters.length > 0) {
      // classifyNode expects the original file path to determine category
      const category = classifyNode(fullPath);
      if (!activeFilters.includes(category)) {
        return; // Skip this node
      }
    }

    visibleNodeIds.add(nodeId);

    // Determine directory hierarchy using the fullPath attribute
    const parts = fullPath.split('/');
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
      id: nodeId, // This is now a GUID
      type: 'appNode',
      position: { x: 0, y: 0 }, // Layout will fix this
      parentId, // This refers to the Group Node ID (path)
      data: {
        label: attributes.label,
        fullPath: attributes.fullPath, // Pass this along
        ...attributes
      },
    });
  });

  // Add group nodes to the nodes list
  // We place group nodes FIRST so they render BEHIND the file nodes
  const groupNodes = Array.from(groupNodesMap.values()).sort((a, b) => {
    // Sort by path depth (number of slashes) ascending, so 'src' comes before 'src/features'
    return a.id.split('/').length - b.id.split('/').length;
  });

  const finalNodes = [...groupNodes, ...nodes];

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
      id: `e-${source}-${target}`, // Stable edge ID based on GUIDs
      source,
      target,
      data: {
        ...attributes
      }
    });
  });

  return { nodes: finalNodes, edges };
}
