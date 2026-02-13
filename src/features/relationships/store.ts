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
          role: 'Source', // Default role for source nodes
          cluster: 'Source', // Default cluster for source nodes, or could be inferred
            degree: 0
        });
      }

      // Target Node
      if (!nodesMap.has(row.Target)) {
        nodesMap.set(row.Target, {
            id: row.Target,
          role: row.Target_Role || 'Target',
          cluster: row.Target_Domain || 'Unspecified',
            degree: 0
        });
      }

      // Link
      links.push({
          source: row.Source,
          target: row.Target,
        relationship: row.Relationship,
        relationshipType: row.Relationship_Type,
        relationshipWeight: +row.Relationship_Weight || 1,
        relationshipStart: row.Relationship_Start,
        relationshipEnd: row.Relationship_End,
        referenceType: row.Reference_Type,
        referenceContext: row.Reference_Context,
        referenceDate: row.Reference_Date,
        notes: row.Notes,
        targetRole: row.Target_Role,
        targetDomain: row.Target_Domain
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
