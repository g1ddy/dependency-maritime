import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './store';
import { type ICruiseResult } from '../../schema/dependency-cruiser';

const mockData = {
  summary: {
    violations: [],
    error: 0,
    warn: 0,
    info: 0,
    ignore: 0,
    totalCruised: 1,
    totalDependenciesCruised: 0,
    optionsUsed: {},
  },
  modules: [
    {
      source: 'src/App.tsx',
      dependencies: [],
      dependents: [],
      valid: true
    }
  ]
};

describe('Reparenting Consistency', () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
    useGraphStore.getState().setGraphData(mockData as unknown as ICruiseResult);
  });

  it('updates the underlying Graphology graph when reparenting', () => {
    const store = useGraphStore.getState();
    const node = store.nodes.find(n => n.data.fullPath === 'src/App.tsx');
    if (!node) throw new Error('Node not found');

    const newParentId = 'src/components';
    const expectedNewPath = 'src/components/App.tsx';

    // 1. Reparent the node
    store.reparentNode(node.id, newParentId, { x: 50, y: 50 });

    const state = useGraphStore.getState();

    // Check React Flow state (Visual) - this should pass currently
    const updatedNode = state.nodes.find(n => n.id === node.id);
    expect(updatedNode?.data.fullPath).toBe(expectedNewPath);
    expect(updatedNode?.parentId).toBe(newParentId);

    // Check Graphology state (Data) - this should FAIL currently
    const graph = state.graph;
    if (!graph) throw new Error('Graph not initialized');

    const graphNodeAttributes = graph.getNodeAttributes(node.id);
    expect(graphNodeAttributes.fullPath).toBe(expectedNewPath);
  });

  it('preserves reparenting changes after toggling filters', () => {
    const store = useGraphStore.getState();
    const node = store.nodes.find(n => n.data.fullPath === 'src/App.tsx');
    if (!node) throw new Error('Node not found');

    const newParentId = 'src/components';

    // 1. Reparent
    store.reparentNode(node.id, newParentId, { x: 50, y: 50 });

    // 2. Trigger a re-transformation (e.g., toggle type definitions)
    store.toggleTypeDefinitions();

    const state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    // If graph wasn't updated, this will revert to 'src/App.tsx'
    expect(updatedNode?.data.fullPath).toBe('src/components/App.tsx');
    expect(updatedNode?.parentId).toBe(newParentId);
  });
});
