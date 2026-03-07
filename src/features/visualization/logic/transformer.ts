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
    const r = (typeof crypto !== 'undefined' && crypto.getRandomValues)
        ? crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0
        : Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
    isolateModule?: boolean;
  } = {}
): { nodes: Node[]; edges: Edge[]; finalNodeIds: Set<string> } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let visibleNodeIds = new Set<string>();
  const groupNodesMap = new Map<string, Node>();
  const dirToNodes = new Map<
    string,
    Array<{ id: string; attributes: Record<string, unknown> }>
  >();
  const rootNodes: Array<{
    id: string;
    attributes: Record<string, unknown>;
  }> = [];

  const activeFilters = options.activeFilters || [];

  // 1. First pass: Filter nodes and group them by directory
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
  });

  const finalNodeIds = new Set<string>();

  // 1.5. Apply Isolate Module Filter (remove unconnected nodes)
  if (options.isolateModule) {
    const connectedNodeIds = new Set<string>();
    graph.forEachEdge((_edgeId, attributes, source, target) => {
      // Only consider edges where both endpoints are currently visible
      if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) {
        return;
      }

      // Respect hideTypeDefinitions during isolation check
      if (
        options.hideTypeDefinitions &&
        Array.isArray(attributes.dependencyTypes) &&
        attributes.dependencyTypes.includes('type-only')
      ) {
        return;
      }

      connectedNodeIds.add(source);
      connectedNodeIds.add(target);
    });

    // Intersect visibleNodeIds with connectedNodeIds
    visibleNodeIds = new Set(
      [...visibleNodeIds].filter((id) => connectedNodeIds.has(id))
    );
  }

  // 1.6. Re-process visible nodes to build hierarchy
  visibleNodeIds.forEach((nodeId) => {
    const attributes = graph.getNodeAttributes(nodeId);
    const fullPath = (attributes.fullPath as string) || '';

    const lastSlashIndex = fullPath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      rootNodes.push({ id: nodeId, attributes });
    } else {
      const dirPath = fullPath.substring(0, lastSlashIndex);
      if (!dirToNodes.has(dirPath)) {
        dirToNodes.set(dirPath, []);
      }
      dirToNodes.get(dirPath)!.push({ id: nodeId, attributes });
    }
  });

  // 2. Process directories to create group nodes
  // Iterating over unique directories minimizes redundant ancestor checks
  for (const dirPath of dirToNodes.keys()) {
    let currentPath = dirPath;
    while (currentPath) {
      if (groupNodesMap.has(currentPath)) {
        // If we found the group, we assume its ancestors are also created
        break;
      }

      const lastSlash = currentPath.lastIndexOf('/');
      const label =
        lastSlash === -1
          ? currentPath
          : currentPath.substring(lastSlash + 1);
      const parentId =
        lastSlash === -1 ? undefined : currentPath.substring(0, lastSlash);

      groupNodesMap.set(currentPath, {
        id: currentPath,
        type: 'groupNode',
        position: { x: 0, y: 0 },
        data: { label },
        parentId,
        style: { width: 100, height: 100 }, // Default size, Dagre will resize
      });
      finalNodeIds.add(currentPath);

      if (!parentId) {
        break;
      }
      currentPath = parentId;
    }
  }

  // 3. Create App Nodes

  const createAppNode = (
    id: string,
    attributes: Record<string, unknown>,
    parentId: string | undefined
  ): Node => ({
    id,
    type: 'appNode',
    position: { x: 0, y: 0 },
    parentId,
    data: {
      label: attributes.label as string,
      fullPath: attributes.fullPath as string,
      ...attributes,
    },
  });

  // Add root nodes
  for (const { id, attributes } of rootNodes) {
    nodes.push(createAppNode(id, attributes, undefined));
    finalNodeIds.add(id);
  }

  // Add directory nodes
  for (const [dirPath, dirNodes] of dirToNodes) {
    for (const { id, attributes } of dirNodes) {
      nodes.push(createAppNode(id, attributes, dirPath));
      finalNodeIds.add(id);
    }
  }

  // Add group nodes to the nodes list
  // We place group nodes FIRST so they render BEHIND the file nodes
  const groupNodes = Array.from(groupNodesMap.values())
    .map((node) => {
      let depth = 0;
      for (let i = 0; i < node.id.length; i++) {
        if (node.id[i] === '/') {
          depth++;
        }
      }
      return {
        node,
        depth,
      };
    })
    .sort((a, b) => {
      // Sort by path depth (number of slashes) ascending, so 'src' comes before 'src/features'
      return a.depth - b.depth;
    })
    .map((item) => item.node);

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

  return { nodes: finalNodes, edges, finalNodeIds };
}
