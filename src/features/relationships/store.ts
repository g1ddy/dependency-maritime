import { create } from 'zustand';
import type { RelationshipNode, RelationshipLink, CsvRow } from './types';

interface RelationshipState {
  nodesById: Map<string, RelationshipNode>;
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
  nodesById: new Map(),
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

    // Calculate degree (O(E) instead of O(N*E))
    links.forEach(l => {
        const sourceNode = nodesMap.get(l.source as string);
        const targetNode = nodesMap.get(l.target as string);

        if (sourceNode) {
            sourceNode.degree++;
        }
        // Avoid double-counting self-loops
        if (targetNode && l.source !== l.target) {
            targetNode.degree++;
        }
    });

    set({ nodesById: nodesMap, links, selectedNodeId: null, isLoading: false });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ nodesById: new Map(), links: [], selectedNodeId: null })
}));
