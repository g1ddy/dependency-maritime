import { create } from 'zustand';
import type { RelationshipNode, RelationshipLink, CsvRow } from './types';

interface RelationshipState {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  selectedNodeId: string | null;
  isLoading: boolean;

  // Actions
  setData: (csvData: CsvRow[]) => void;
  selectNode: (nodeId: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useRelationshipStore = create<RelationshipState>((set) => ({
  nodes: [],
  links: [],
  selectedNodeId: null,
  isLoading: false,

  setData: (rows: CsvRow[]) => {
    const nodesMap = new Map<string, RelationshipNode>();
    const links: RelationshipLink[] = [];

    rows.forEach(row => {
      // Source Node
      if (!nodesMap.has(row.Source)) {
        nodesMap.set(row.Source, {
            id: row.Source,
            role: row.Source === 'Jeffrey Epstein' ? 'Central Figure' : (row.Source === 'Ghislaine Maxwell' ? 'Accomplice' : 'Associated Figure'),
            cluster: row.Source === 'Jeffrey Epstein' ? 'Central Node' : row.Context_Cluster,
            degree: 0
        });
      }

      // Target Node
      if (!nodesMap.has(row.Target)) {
        nodesMap.set(row.Target, {
            id: row.Target,
            role: row.Target_Role,
            cluster: row.Context_Cluster,
            degree: 0
        });
      }

      // Link
      links.push({
          source: row.Source,
          target: row.Target,
          relationshipType: row.Relationship_Type,
          value: +row.Value || 1,
          evidenceType: row.Evidence_Type,
          releaseContext: row.Release_Context,
          contextCluster: row.Context_Cluster,
          targetRole: row.Target_Role
      });
    });

    const nodes = Array.from(nodesMap.values());

    // Calculate degree
    nodes.forEach(n => {
        n.degree = links.filter(l => l.source === n.id || l.target === n.id).length;
    });

    set({ nodes, links, selectedNodeId: null, isLoading: false });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ nodes: [], links: [], selectedNodeId: null })
}));
