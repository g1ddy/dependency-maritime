import { create } from 'zustand';
import type { RelationshipNode, RelationshipLink, CsvRow } from './types';

export const NODE_ROLES = {
  SOURCE: 'Source',
  TARGET: 'Target',
} as const;

export const NODE_CLUSTERS = {
  SOURCE: 'Source',
  UNSPECIFIED: 'Unspecified',
} as const;

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
          role: NODE_ROLES.SOURCE, // Default role for source nodes
          cluster: NODE_CLUSTERS.SOURCE, // Default cluster for source nodes, or could be inferred
          degree: 0
        });
      }

      // Target Node
      const targetNode = nodesMap.get(row.Target);
      if (!targetNode) {
        nodesMap.set(row.Target, {
          id: row.Target,
          role: row.Target_Role || NODE_ROLES.TARGET,
          cluster: row.Target_Domain || NODE_CLUSTERS.UNSPECIFIED,
          degree: 0
        });
      } else {
        // Update existing node with Target info if it's more specific
        // We prioritize explicit Target_Role/Domain over default 'Source'/'Target'/'Unspecified'
        if (row.Target_Role && (targetNode.role === NODE_ROLES.SOURCE || targetNode.role === NODE_ROLES.TARGET)) {
          targetNode.role = row.Target_Role;
        }
        if (row.Target_Domain && (targetNode.cluster === NODE_CLUSTERS.SOURCE || targetNode.cluster === NODE_CLUSTERS.UNSPECIFIED)) {
          targetNode.cluster = row.Target_Domain;
        }
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
