import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './store';
import { type ICruiseResult } from '../../schema/dependency-cruiser';

// Inline mock data to ensure deterministic tests
const mockData: ICruiseResult = {
  summary: {
    violations: [],
    error: 0,
    warn: 0,
    info: 0,
    ignore: 0,
    totalCruised: 3,
    totalDependenciesCruised: 0,
    optionsUsed: {}
  },
  modules: [
    {
      source: 'src/App.tsx',
      dependencies: [],
      dependents: [],
      valid: true
    },
    {
      source: 'src/components/Button.tsx',
      dependencies: [],
      dependents: [],
      valid: true
    },
    {
      source: 'src/features/Game.tsx',
      dependencies: [],
      dependents: [],
      valid: true
    }
  ]
};

describe('Reparenting Logic', () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
    useGraphStore.getState().setGraphData(mockData);
  });

  it('should update fullPath correctly when moving node to a new folder', () => {
    const store = useGraphStore.getState();

    let state = useGraphStore.getState();
    const node = state.nodes.find(n => n.data.fullPath === 'src/App.tsx');
    if (!node) throw new Error('Node src/App.tsx not found');

    // Initial check
    expect(node.data.fullPath).toBe('src/App.tsx');

    // Move to 'src/components'
    // In the app, dragging to a folder Group Node sends that Group Node's ID as newParentId.
    // Group Node IDs are their paths.
    const newParentId = 'src/components';

    store.reparentNode(node.id, newParentId, { x: 50, y: 50 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    // Verify parentId
    expect(updatedNode?.parentId).toBe('src/components');

    // Verify fullPath - THIS IS THE CRITICAL USER REQUIREMENT
    // The overlay reads this field. It must be correct.
    expect(updatedNode?.data.fullPath).toBe('src/components/App.tsx');
  });

  it('should update fullPath correctly when moving node to root', () => {
    const store = useGraphStore.getState();

    let state = useGraphStore.getState();
    const node = state.nodes.find(n => n.data.fullPath === 'src/components/Button.tsx');
    if (!node) throw new Error('Node src/components/Button.tsx not found');

    expect(node.data.fullPath).toBe('src/components/Button.tsx');

    // Move to root (undefined parentId)
    store.reparentNode(node.id, undefined, { x: 0, y: 0 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    expect(updatedNode?.parentId).toBeUndefined();
    expect(updatedNode?.data.fullPath).toBe('Button.tsx');
  });

  it('should update fullPath correctly when moving node to a nested folder', () => {
    const store = useGraphStore.getState();

    let state = useGraphStore.getState();
    const node = state.nodes.find(n => n.data.fullPath === 'src/App.tsx');
    if (!node) throw new Error('Node src/App.tsx not found');

    // Move to deeper nested folder
    const newParentId = 'src/features/visualization/logic';
    store.reparentNode(node.id, newParentId, { x: 100, y: 100 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    expect(updatedNode?.parentId).toBe('src/features/visualization/logic');
    expect(updatedNode?.data.fullPath).toBe('src/features/visualization/logic/App.tsx');
  });
});
