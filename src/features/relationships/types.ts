export interface RelationshipNode {
  id: string;
  role: string;
  cluster: string;
  degree: number;

  // D3 Simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface RelationshipLink {
  source: string | RelationshipNode;
  target: string | RelationshipNode;
  relationshipType: string;
  value: number;
  evidenceType: string;
  releaseContext: string;
  contextCluster: string; // usually same as source cluster but kept for link context
  targetRole: string;
}

export interface CsvRow {
  Source: string;
  Target: string;
  Relationship_Type: string;
  Value: string; // Parsed as string from CSV
  Evidence_Type: string;
  Release_Context: string;
  Context_Cluster: string;
  Target_Role: string;
}
