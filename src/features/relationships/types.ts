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

// Internal Link Structure
export interface RelationshipLink {
  source: string | RelationshipNode;
  target: string | RelationshipNode;

  // Core Relationship Data
  relationship: string;          // from 'Relationship'
  relationshipType: string;      // from 'Relationship_Type'
  relationshipWeight: number;    // from 'Relationship_Weight'

  // Timeline
  relationshipStart?: string;    // from 'Relationship_Start'
  relationshipEnd?: string;      // from 'Relationship_End'

  // Evidence / Context
  referenceType: string;         // from 'Reference_Type'
  referenceContext: string;      // from 'Reference_Context'
  referenceDate?: string;        // from 'Reference_Date'
  notes?: string;                // from 'Notes'

  // Original Context
  targetRole: string;            // from 'Target_Role'
  targetDomain: string;          // from 'Target_Domain'
}

// Raw CSV Structure matching "Standardized Master Schema"
export interface CsvRow {
  Source: string;
  Target: string;
  Target_Role: string;
  Target_Domain: string;         // Mapped to 'cluster' / 'domain'
  Relationship: string;          // Mapped to 'relationship'
  Relationship_Type: string;     // Mapped to 'relationshipType'
  Relationship_Weight: string;   // Mapped to 'weight'
  Relationship_Start?: string;
  Relationship_End?: string;
  Reference_Type: string;
  Reference_Context: string;
  Reference_Date?: string;
  Notes?: string;
}
