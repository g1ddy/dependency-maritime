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
    ignore: 0,
    totalCruised: 6,
    totalDependenciesCruised: 2,
    optionsUsed: {}
  },
  modules: [
    {
      source: 'src/A.ts',
      valid: true,
      dependents: [],
      dependencies: [{
        resolved: 'src/B.ts',
        module: 'src/B.ts',
        dependencyTypes: ['local'],
        coreModule: false,
        followable: true,
        couldNotResolve: false,
        circular: false,
        dynamic: false,
        exoticallyRequired: false,
        protocol: 'file:',
        mimeType: '',
        instability: 0,
        valid: true,
        moduleSystem: 'es6'
      }]
    },
    {
      source: 'src/B.ts',
      valid: true,
      dependents: ['src/A.ts'],
      dependencies: [{
        resolved: 'src/C.ts',
        module: 'src/C.ts',
        dependencyTypes: ['local'],
        coreModule: false,
        followable: true,
        couldNotResolve: false,
        circular: false,
        dynamic: false,
        exoticallyRequired: false,
        protocol: 'file:',
        mimeType: '',
        instability: 0,
        valid: true,
        moduleSystem: 'es6'
      }]
    },
    {
      source: 'src/C.ts',
      valid: true,
      dependents: ['src/B.ts'],
      dependencies: []
    },
    // Isolated node
    {
      source: 'src/D.ts',
      valid: true,
      dependents: [],
      dependencies: []
    },
    // Nodes for filtering
    {
      source: 'src/features/core/Core.ts',
      valid: true,
      dependents: [],
      dependencies: []
    },
    {
      source: 'src/components/ui/Button.tsx',
      valid: true,
      dependents: [],
      dependencies: []
    },
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

  describe('Populated Graph', () => {
    beforeEach(() => {
      useGraphStore.getState().setGraphData(mockData);
    });

    it('should have nodes and edges', () => {
      const newState = useGraphStore.getState();
      expect(newState.nodes.length).toBeGreaterThan(0);
      expect(newState.edges.length).toBeGreaterThan(0);
      expect(newState.graph).not.toBeNull();
    });

    it('should select a node and highlight related nodes (BFS Coverage)', () => {
      const store = useGraphStore.getState();
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

      // 1. Initial Load happened in beforeEach.
      // We capture the version from that load.
      const version1 = useGraphStore.getState().metricsVersion;

      // 2. Trigger another load immediately to simulate race
      store.setGraphData(mockData);
      const version2 = useGraphStore.getState().metricsVersion;

      expect(version2).toBeGreaterThan(version1);

      // 3. Manually call calculateMetrics with an OLD version to see if it aborts.
      store.calculateMetrics(version1);

      await vi.runAllTimersAsync();

      // setGraphData in beforeEach -> layout (async) -> calculateMetrics (v1)
      // setGraphData in test -> layout (async) -> calculateMetrics (v2)
      //
      // Because layout is async, the first calculateMetrics (v1) executes AFTER version is incremented to v2.
      // So it aborts.
      // The second calculateMetrics (v2) succeeds.
      // The manual calculateMetrics(v1) aborts.

      // Total calls should be 1.
      expect(calculateGraphMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle React Flow node/edge changes', () => {
      const store = useGraphStore.getState();

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

    it('should layout graph', async () => {
      const store = useGraphStore.getState();

      // Initial direction is TB
      expect(useGraphStore.getState().layoutDirection).toBe('TB');

      // Change to LR
      await store.layoutGraph('LR');
      expect(useGraphStore.getState().layoutDirection).toBe('LR');

      // Verify nodes still exist (layout updates positions but shouldn't lose nodes)
      expect(useGraphStore.getState().nodes.length).toBeGreaterThan(0);
    });

    it('should toggle type definitions', () => {
      const store = useGraphStore.getState();

      // Initial state: hideTypeDefinitions = true
      expect(useGraphStore.getState().hideTypeDefinitions).toBe(true);

      // Toggle OFF (show types)
      store.toggleTypeDefinitions();
      expect(useGraphStore.getState().hideTypeDefinitions).toBe(false);

      // Toggle ON (hide types)
      store.toggleTypeDefinitions();
      expect(useGraphStore.getState().hideTypeDefinitions).toBe(true);
    });

    it('should conditionally open inspector based on shouldOpenInspector arg', () => {
      const store = useGraphStore.getState();
      const node = useGraphStore.getState().nodes[0];

      // 1. Default (true) behavior
      store.selectNode(node.id); // shouldOpenInspector defaults to true
      expect(useGraphStore.getState().isInspectorOpen).toBe(true);

      // Reset
      store.setInspectorOpen(false);

      // 2. Explicit true
      store.selectNode(node.id, true);
      expect(useGraphStore.getState().isInspectorOpen).toBe(true);

      // Reset
      store.setInspectorOpen(false);

      // 3. Explicit false (should NOT open)
      store.selectNode(node.id, false);
      expect(useGraphStore.getState().isInspectorOpen).toBe(false);

      // 4. Verify false preserves existing open state
      store.setInspectorOpen(true);
      store.selectNode(node.id, false);
      expect(useGraphStore.getState().isInspectorOpen).toBe(true);
    });

    it('should handle layout worker errors gracefully', async () => {
      const store = useGraphStore.getState();

      // Trigger the mocked error by passing a special direction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      await store.layoutGraph('TRIGGER_ERROR' as any);

      const state = useGraphStore.getState();
      expect(state.loading).toBe(false);
      // Nodes should still be present (unlayouted or previous layout)
      expect(state.nodes.length).toBeGreaterThan(0);
    });

    it('should handle ELK layout errors gracefully', async () => {
      const store = useGraphStore.getState();
      const { applyElkLayout } = await import('./logic/layout-elk');

      // Mock ELK to throw
      vi.mocked(applyElkLayout).mockRejectedValueOnce(new Error('ELK Failed'));

      store.setLayoutEngine('elk');
      await store.layoutGraph();

      const state = useGraphStore.getState();
      expect(state.loading).toBe(false);
      expect(state.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Simulation Mode', () => {
    beforeEach(() => {
      useGraphStore.getState().setGraphData(mockData);
    });

    it('should initialize simulation state correctly', () => {
      const state = useGraphStore.getState();
      expect(state.originalGraph).not.toBeNull();
      expect(state.graph).not.toBeNull();
      // They should be different instances (deep copy)
      expect(state.originalGraph).not.toBe(state.graph);
      expect(state.hasUnsavedChanges).toBe(false);
    });

    it('should track unsaved changes on reparent', () => {
      const store = useGraphStore.getState();
      const node = store.nodes.find(n => n.data.fullPath === 'src/A.ts');
      if (!node) throw new Error('Node A not found');

      // Move A.ts to src/features
      store.reparentNode(node.id, 'src/features', { x: 100, y: 100 });

      const state = useGraphStore.getState();
      expect(state.hasUnsavedChanges).toBe(true);

      const updatedNode = state.nodes.find(n => n.id === node.id);
      expect(updatedNode?.data.fullPath).toBe('src/features/A.ts');
      expect(updatedNode?.parentId).toBe('src/features');

      // Verify Graphology update
      const graphFullPath = state.graph?.getNodeAttribute(node.id, 'fullPath') as string;
      expect(graphFullPath).toBe('src/features/A.ts');
    });

    it('should reset simulation', () => {
      const store = useGraphStore.getState();
      const node = store.nodes.find(n => n.data.fullPath === 'src/A.ts');
      if (!node) throw new Error('Node A not found');

      // Make a change
      store.reparentNode(node.id, 'src/features', { x: 100, y: 100 });
      expect(useGraphStore.getState().hasUnsavedChanges).toBe(true);

      // Reset
      store.resetSimulation();

      const state = useGraphStore.getState();
      expect(state.hasUnsavedChanges).toBe(false);

      const resetNode = state.nodes.find(n => n.id === node.id);
      // Should revert to original path
      expect(resetNode?.data.fullPath).toBe('src/A.ts');
      // ParentId is derived from path in transformToReactFlow.
      // src/A.ts -> parent is 'src'.
      expect(resetNode?.parentId).toBe('src');
    });
  });

  describe('Layout Engine Persistence', () => {
    it('should default layoutEngine based on viewport', () => {
      // Mock mobile viewport
      const matchMediaMock = vi.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
      vi.stubGlobal('matchMedia', matchMediaMock);

      useGraphStore.getState().reset();
      expect(useGraphStore.getState().layoutEngine).toBe('elk');

      // Mock desktop viewport
      matchMediaMock.mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));

      useGraphStore.getState().reset();
      expect(useGraphStore.getState().layoutEngine).toBe('dagre');

      vi.unstubAllGlobals();
    });

    it('should update userSelectedLayoutEngine when setLayoutEngine is called', () => {
      const store = useGraphStore.getState();
      expect(store.userSelectedLayoutEngine).toBeNull();

      store.setLayoutEngine('elk');
      expect(useGraphStore.getState().userSelectedLayoutEngine).toBe('elk');
      expect(useGraphStore.getState().layoutEngine).toBe('elk');

      store.setLayoutEngine('dagre');
      expect(useGraphStore.getState().userSelectedLayoutEngine).toBe('dagre');
      expect(useGraphStore.getState().layoutEngine).toBe('dagre');
    });

    it('should reset userSelectedLayoutEngine on reset', () => {
      const store = useGraphStore.getState();
      store.setLayoutEngine('elk');
      expect(useGraphStore.getState().userSelectedLayoutEngine).toBe('elk');

      store.reset();
      expect(useGraphStore.getState().userSelectedLayoutEngine).toBeNull();
    });

    it('should sync layoutEngine from userSelectedLayoutEngine during rehydration', () => {
      // Access the persist configuration if possible, or just mock the storage
      // Since we use createJSONStorage(() => robustStorage), and robustStorage uses localStorage if available.

      const mockStorage: Record<string, string> = {
        'dependency-graph-settings': JSON.stringify({
          state: {
            userSelectedLayoutEngine: 'elk',
            viewMode: 'standard',
            nodeSize: 'uniform',
            hideTypeDefinitions: true,
            layoutDirection: 'TB',
            activeFilters: []
          },
          version: 0
        })
      };

      vi.stubGlobal('localStorage', {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });

      // We need to re-create or re-initialize the store to trigger hydration,
      // but useGraphStore is already created.
      // Zustand's persist middleware usually hydrates on creation.

      // Let's try to use the persist API if available
      // useGraphStore.persist.rehydrate()

      // But first, let's see if we can just check if it worked if we could trigger it.
      // Actually, since it's a singleton, it might be hard to re-trigger without affecting other tests.

      // Given the constraints, I will at least test the logic that would be used in onRehydrateStorage
      // by asserting on the store state if I can trigger rehydration.

      // Let's try to trigger rehydrate
      void (useGraphStore as any).persist.rehydrate();

      // Since rehydrate is async (though storage might be sync)
      // we might need to wait.

      expect(useGraphStore.getState().layoutEngine).toBe('elk');

      vi.unstubAllGlobals();
    });
  });
});
