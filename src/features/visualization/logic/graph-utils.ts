import Graph from 'graphology';

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
  if (!graph.hasAttribute('folderToDescendants')) {
    const map = buildDescendantsMap(graph);
    graph.setAttribute('folderToDescendants', map);
  }

  const map = graph.getAttribute('folderToDescendants') as Map<string, string[]>;
  return map.get(folderPath) || [];
}
