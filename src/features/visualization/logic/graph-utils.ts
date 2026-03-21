import { type Node } from '@xyflow/react';
import Graph from 'graphology';

export const FOLDER_DESCENDANTS_CACHE_KEY = 'folderToDescendants';

/**
 * Builds a map from folder paths to lists of descendant node IDs.
 */
function buildDescendantsMap(graph: Graph): Map<string, string[]> {
  const folderToDescendants = new Map<string, string[]>();

  graph.forEachNode((nodeId, attributes) => {
    const fullPath = attributes.fullPath as string;
    if (!fullPath) return;

    const lastSlashIndex = fullPath.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      let currentPath = fullPath.substring(0, lastSlashIndex);
      while (currentPath) {
        if (!folderToDescendants.has(currentPath)) {
          folderToDescendants.set(currentPath, []);
        }
        folderToDescendants.get(currentPath)!.push(nodeId);

        const nextSlashIndex = currentPath.lastIndexOf('/');
        if (nextSlashIndex === -1) break;
        currentPath = currentPath.substring(0, nextSlashIndex);
      }
    }
  });

  return folderToDescendants;
}

/**
 * Retrieves the list of descendant node IDs for a given folder path.
 * Uses a cached map stored as a graph attribute for O(1) subsequent lookups.
 */
export function getFolderDescendants(graph: Graph, folderPath: string): string[] {
  // Check if we have a cached map
  if (!graph.hasAttribute(FOLDER_DESCENDANTS_CACHE_KEY)) {
    const map = buildDescendantsMap(graph);
    graph.setAttribute(FOLDER_DESCENDANTS_CACHE_KEY, map);
  }

  const map = graph.getAttribute(FOLDER_DESCENDANTS_CACHE_KEY) as Map<string, string[]>;
  return map.get(folderPath) || [];
}

/**
 * Creates a Map of nodes by ID efficiently for O(1) lookups.
 * Using a manual loop is faster and generates less garbage than new Map(nodes.map(...)).
 */
export function createNodesById(nodes: Node[]): Map<string, Node> {
  const map = new Map<string, Node>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  return map;
}
