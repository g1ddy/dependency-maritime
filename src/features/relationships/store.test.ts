import { describe, it, expect, beforeEach } from 'vitest';
import { useRelationshipStore } from './store';
import type { CsvRow } from './types';

describe('useRelationshipStore', () => {
  beforeEach(() => {
    useRelationshipStore.getState().reset();
  });

  it('should update node attributes when a node appears as a target after appearing as a source', () => {
    const csvData: CsvRow[] = [
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: 'Interface',
        Target_Domain: 'UI',
        Relationship: 'Depends',
        Relationship_Type: 'Call',
        Relationship_Weight: '1',
        Reference_Type: 'Code',
        Reference_Context: 'File.ts'
      },
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: 'Class',
        Target_Domain: 'Core',
        Relationship: 'Depends',
        Relationship_Type: 'Call',
        Relationship_Weight: '1',
        Reference_Type: 'Code',
        Reference_Context: 'File.ts'
      }
    ];

    useRelationshipStore.getState().setData(csvData);
    const { nodes } = useRelationshipStore.getState();

    const nodeB = nodes.find(n => n.id === 'NodeB');
    expect(nodeB).toBeDefined();
    // BUG: nodeB will have role: 'Source' and cluster: 'Source' because it appeared as Source first
    expect(nodeB?.role).toBe('Class');
    expect(nodeB?.cluster).toBe('Core');
  });

  it('should handle Target info appearing before Source info correctly', () => {
     const csvData: CsvRow[] = [
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: 'Class',
        Target_Domain: 'Core',
        Relationship: 'Depends',
        Relationship_Type: 'Call',
        Relationship_Weight: '1',
        Reference_Type: 'Code',
        Reference_Context: 'File.ts'
      },
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: 'Interface',
        Target_Domain: 'UI',
        Relationship: 'Depends',
        Relationship_Type: 'Call',
        Relationship_Weight: '1',
        Reference_Type: 'Code',
        Reference_Context: 'File.ts'
      }
    ];

    useRelationshipStore.getState().setData(csvData);
    const { nodes } = useRelationshipStore.getState();

    const nodeB = nodes.find(n => n.id === 'NodeB');
    expect(nodeB).toBeDefined();
    expect(nodeB?.role).toBe('Class');
    expect(nodeB?.cluster).toBe('Core');
  });
});
