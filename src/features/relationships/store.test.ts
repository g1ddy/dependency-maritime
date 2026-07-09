import { describe, it, expect, beforeEach } from 'vitest';
import { useRelationshipStore } from './store';
import type { CsvRow } from './types';

describe('useRelationshipStore', () => {
  beforeEach(() => {
    useRelationshipStore.getState().reset();
  });

  it('should correctly merge node attributes when a node appears as both source and target', () => {
    const csvData: CsvRow[] = [
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: 'SpecificRole',
        Target_Domain: 'SpecificDomain',
        Relationship: 'Rel1',
        Relationship_Type: 'Type1',
        Relationship_Weight: '1',
        Reference_Type: 'Ref1',
        Reference_Context: 'Ctx1'
      },
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: 'AnotherRole',
        Target_Domain: 'AnotherDomain',
        Relationship: 'Rel2',
        Relationship_Type: 'Type2',
        Relationship_Weight: '1',
        Reference_Type: 'Ref2',
        Reference_Context: 'Ctx2'
      }
    ];

    useRelationshipStore.getState().setData(csvData);

    const nodesById = useRelationshipStore.getState().nodesById;
    const nodeB = nodesById.get('NodeB');

    expect(nodeB).toBeDefined();
    // NodeB appears as Target in the first row, so it should have SpecificRole and SpecificDomain
    expect(nodeB?.role).toBe('SpecificRole');
    expect(nodeB?.cluster).toBe('SpecificDomain');
  });

  it('should prioritize Target attributes even if Source appears first', () => {
    const csvData: CsvRow[] = [
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: 'AnotherRole',
        Target_Domain: 'AnotherDomain',
        Relationship: 'Rel2',
        Relationship_Type: 'Type2',
        Relationship_Weight: '1',
        Reference_Type: 'Ref2',
        Reference_Context: 'Ctx2'
      },
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: 'SpecificRole',
        Target_Domain: 'SpecificDomain',
        Relationship: 'Rel1',
        Relationship_Type: 'Type1',
        Relationship_Weight: '1',
        Reference_Type: 'Ref1',
        Reference_Context: 'Ctx1'
      }
    ];

    useRelationshipStore.getState().setData(csvData);

    const nodesById = useRelationshipStore.getState().nodesById;
    const nodeB = nodesById.get('NodeB');

    expect(nodeB).toBeDefined();
    // Even though NodeB appeared as Source first (getting default 'Source' attributes),
    // it should be updated with 'SpecificRole' and 'SpecificDomain' when it appears as Target.
    expect(nodeB?.role).toBe('SpecificRole');
    expect(nodeB?.cluster).toBe('SpecificDomain');
  });

  it('should upgrade from Source to Target even if no specific attributes are provided', () => {
    const csvData: CsvRow[] = [
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: '',
        Target_Domain: '',
        Relationship: 'Rel2',
        Relationship_Type: 'Type2',
        Relationship_Weight: '1',
        Reference_Type: 'Ref2',
        Reference_Context: 'Ctx2'
      },
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: '',
        Target_Domain: '',
        Relationship: 'Rel1',
        Relationship_Type: 'Type1',
        Relationship_Weight: '1',
        Reference_Type: 'Ref1',
        Reference_Context: 'Ctx1'
      }
    ];

    useRelationshipStore.getState().setData(csvData);

    const nodesById = useRelationshipStore.getState().nodesById;
    const nodeB = nodesById.get('NodeB');

    expect(nodeB).toBeDefined();
    // NodeB should be upgraded to 'Target' / 'Unspecified'
    expect(nodeB?.role).toBe('Target');
    expect(nodeB?.cluster).toBe('Unspecified');
  });

  it('should handle providing only domain when upgrading from Source', () => {
    const csvData: CsvRow[] = [
      {
        Source: 'NodeB',
        Target: 'NodeC',
        Target_Role: '',
        Target_Domain: '',
        Relationship: 'Rel2',
        Relationship_Type: 'Type2',
        Relationship_Weight: '1',
        Reference_Type: 'Ref2',
        Reference_Context: 'Ctx2'
      },
      {
        Source: 'NodeA',
        Target: 'NodeB',
        Target_Role: '',
        Target_Domain: 'NewDomain',
        Relationship: 'Rel1',
        Relationship_Type: 'Type1',
        Relationship_Weight: '1',
        Reference_Type: 'Ref1',
        Reference_Context: 'Ctx1'
      }
    ];

    useRelationshipStore.getState().setData(csvData);

    const nodesById = useRelationshipStore.getState().nodesById;
    const nodeB = nodesById.get('NodeB');

    expect(nodeB).toBeDefined();
    expect(nodeB?.role).toBe('Target');
    expect(nodeB?.cluster).toBe('NewDomain');
  });
});
