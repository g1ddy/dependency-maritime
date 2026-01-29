import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphStore } from './store';
import { calculateGraphMetrics } from './logic/metrics'; // Direct import of the function to mock
import { type ICruiseResult } from '../../schema/dependency-cruiser';
import { type NodeChange, type EdgeChange } from '@xyflow/react';

// Mock the metrics logic to allow spying while keeping implementation
vi.mock('./logic/metrics', async () => {
  const actual = await vi.importActual<typeof import('./logic/metrics')>('./logic/metrics');
  return {
    ...actual,
    calculateGraphMetrics: vi.fn(actual.calculateGraphMetrics),
  };
});

// Inline mock data
const mockData: ICruiseResult = {
  summary: {
    violations: [],
    error: 0,
    warn: 0,
    info: 0,
    totalCruised: 1,
    totalDependenciesCruised: 0,
    optionsUsed: {}
  },
  modules: [
    { source: 'src/A.ts', dependencies: [{ resolved: 'src/B.ts', module: 'src/B.ts', dependencyTypes: ['local'], coreModule: false, followable: true, couldNotResolve: false }], dependents: [] },
    { source: 'src/B.ts', dependencies: [{ resolved: 'src/C.ts', module: 'src/C.ts', dependencyTypes: ['local'], coreModule: false, followable: true, couldNotResolve: false }], dependents: ['src/A.ts'] },
    { source: 'src/C.ts', dependencies: [], dependents: ['src/B.ts'] },
    // Isolated node
    { source: 'src/D.ts', dependencies: [], dependents: [] },
    // Nodes for filtering
    { source: 'src/features/core/Core.ts', dependencies: [], dependents: [] },
    { source: 'src/components/ui/Button.tsx', dependencies: [], dependents: [] },
  ]
};

describe('Visualization Store', () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
    vi.useRealTimers();
    vi.clearAllMocks(); // Clear call counts
  });

  it('should initialize with empty state', () => {
    const state = useGraphStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.graph).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.hideTypeDefinitions).toBe(true);
  });

  it('should set graph data and generate nodes/edges', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    const newState = useGraphStore.getState();
    expect(newState.nodes.length).toBeGreaterThan(0);
    expect(newState.edges.length).toBeGreaterThan(0);
    expect(newState.graph).not.toBeNull();
  });

  it('should select a node and highlight related nodes (BFS Coverage)', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    let state = useGraphStore.getState();
    // Select 'src/B.ts' which is in the middle: A -> B -> C
    const nodeB = state.nodes.find(n => n.data.fullPath === 'src/B.ts');
    if (!nodeB) throw new Error('Node B not found');

    store.selectNode(nodeB.id);

    state = useGraphStore.getState();
    const nodeA = state.nodes.find(n => n.data.fullPath === 'src/A.ts');
    const nodeC = state.nodes.find(n => n.data.fullPath === 'src/C.ts');
    const nodeD = state.nodes.find(n => n.data.fullPath === 'src/D.ts');

    // B should be selected
    expect(state.selectedNodeId).toBe(nodeB.id);

    // A (ancestor) and C (descendant) should be highlighted
    expect(nodeA?.data.highlighted).toBe(true);
    expect(nodeC?.data.highlighted).toBe(true);

    // D (isolated) should NOT be highlighted, but dimmed
    expect(nodeD?.data.highlighted).toBe(false);
    expect(nodeD?.data.dimmed).toBe(true);
  });

  it('should handle complex filter combinations', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    // Initial: []
    expect(useGraphStore.getState().activeFilters).toEqual([]);

    // Add 'core'
    store.setFilter('core');
    expect(useGraphStore.getState().activeFilters).toEqual(['core']);

    // Add 'ui' -> ['core', 'ui']
    store.setFilter('ui');
    expect(useGraphStore.getState().activeFilters).toEqual(['core', 'ui']);

    // Remove 'core' -> ['ui']
    store.setFilter('core');
    expect(useGraphStore.getState().activeFilters).toEqual(['ui']);

    // Reset to all
    store.setFilter('all');
    expect(useGraphStore.getState().activeFilters).toEqual([]);
  });

  it('should handle async metrics calculation race conditions', async () => {
    vi.useFakeTimers();
    const store = useGraphStore.getState();

    // 1. Initial Load
    store.setGraphData(mockData);
    const version1 = useGraphStore.getState().metricsVersion;

    // 2. Trigger another load immediately to simulate race
    store.setGraphData(mockData);
    const version2 = useGraphStore.getState().metricsVersion;

    expect(version2).toBeGreaterThan(version1);

    // 3. Manually call calculateMetrics with an OLD version to see if it aborts.
    store.calculateMetrics(version1);

    await vi.runAllTimersAsync();

    // In current implementation:
    // setGraphData -> calls calculateMetrics(newVersion) -> calls calculateGraphMetrics
    // calculateMetrics -> checks version -> calls calculateGraphMetrics -> checks version -> updates store

    // Since setGraphData calls it immediately, it will be called twice total for the two setGraphData calls.
    // The manual call `store.calculateMetrics(version1)`:
    // current version is version2. target is version1.
    // `if (get().metricsVersion !== targetVersion) return;` at start of function.
    // So calculateGraphMetrics should NOT be called for the manual invocation.

    // Total calls should be 2 (from the two setGraphData calls).
    expect(calculateGraphMetrics).toHaveBeenCalledTimes(2);
  });

  it('should handle React Flow node/edge changes', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    const node = useGraphStore.getState().nodes[0];
    const change: NodeChange = {
        id: node.id,
        type: 'position',
        position: { x: 999, y: 999 }
    };

    store.onNodesChange([change]);

    const updatedNode = useGraphStore.getState().nodes.find(n => n.id === node.id);
    expect(updatedNode?.position.x).toBe(999);

    // Edge change (selection)
    const edge = useGraphStore.getState().edges[0];
    // Create a valid EdgeChange object for selection
    // Note: The type definition might require specific fields
    // Assuming 'select' type change
    const edgeChange: EdgeChange = {
        id: edge.id,
        type: 'select',
        selected: true
    };

    store.onEdgesChange([edgeChange]);
    const updatedEdge = useGraphStore.getState().edges.find(e => e.id === edge.id);
    expect(updatedEdge?.selected).toBe(true);
  });

  it('should deselect node', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    const node = useGraphStore.getState().nodes[0];
    store.selectNode(node.id);
    expect(useGraphStore.getState().selectedNodeId).toBe(node.id);

    store.selectNode(null);
    expect(useGraphStore.getState().selectedNodeId).toBeNull();

    // Check reset visual state
    const resetNode = useGraphStore.getState().nodes[0];
    expect(resetNode.data.highlighted).toBe(false);
    expect(resetNode.data.dimmed).toBe(false);
  });

  it('should layout graph', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    // Initial direction is TB
    expect(useGraphStore.getState().layoutDirection).toBe('TB');

    // Change to LR
    store.layoutGraph('LR');
    expect(useGraphStore.getState().layoutDirection).toBe('LR');

    // Verify nodes still exist (layout updates positions but shouldn't lose nodes)
    expect(useGraphStore.getState().nodes.length).toBeGreaterThan(0);
  });

  it('should toggle type definitions', () => {
    const store = useGraphStore.getState();
    store.setGraphData(mockData);

    // Initial state: hideTypeDefinitions = true
    expect(useGraphStore.getState().hideTypeDefinitions).toBe(true);

    // Toggle OFF (show types)
    store.toggleTypeDefinitions();
    expect(useGraphStore.getState().hideTypeDefinitions).toBe(false);

    // Toggle ON (hide types)
    store.toggleTypeDefinitions();
    expect(useGraphStore.getState().hideTypeDefinitions).toBe(true);
  });
});
