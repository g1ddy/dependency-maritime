import { render } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storeModule from '../store';
import React from 'react';
import { type Node } from '@xyflow/react';

// Define a minimal interface for the props we are capturing
interface ReactFlowMockProps {
  onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
  children?: React.ReactNode;
  // Allow other props
  [key: string]: unknown;
}

// We need to capture the props passed to ReactFlow
let capturedReactFlowProps: ReactFlowMockProps = {};
const mockGetIntersectingNodes = vi.fn();
const mockGetInternalNode = vi.fn();
const mockGetNode = vi.fn();

// Mock @xyflow/react
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactFlow: (props: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      capturedReactFlowProps = props;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return <div className="react-flow-mock">{props.children}</div>;
    },
    useReactFlow: () => ({
      getIntersectingNodes: mockGetIntersectingNodes,
      getInternalNode: mockGetInternalNode,
      getNode: mockGetNode,
    }),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Background: () => <div>Background</div>,
    Controls: () => <div>Controls</div>,
    MiniMap: () => <div>MiniMap</div>,
  };
});

// Mock the store
vi.mock('../store', () => ({
  useGraphStore: vi.fn(),
}));

type GraphState = ReturnType<typeof storeModule.useGraphStore.getState>;

// Helper factory for creating a type-safe mock state
const createMockGraphState = (overrides: Partial<GraphState> = {}): GraphState => {
  return {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    graph: null,
    originalGraph: null,
    loading: false,
    isCalculatingMetrics: false,
    metricsVersion: 0,
    hideTypeDefinitions: true,
    layoutDirection: 'TB',
    activeFilters: [],
    isInspectorOpen: false,
    rawComplexityMetrics: null,
    viewMode: 'standard',
    setInspectorOpen: vi.fn(),
    setViewMode: vi.fn(),
    setGraphData: vi.fn(),
    calculateMetrics: vi.fn(),
    layoutGraph: vi.fn(),
    selectNode: vi.fn(),
    toggleTypeDefinitions: vi.fn(),
    setFilter: vi.fn(),
    reset: vi.fn(),
    resetSimulation: vi.fn(),
    reparentNode: vi.fn(),
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    hasUnsavedChanges: false,
    ...overrides,
  } as GraphState;
};

describe('DependencyGraph Drag Logic', () => {
  const srcGroup = {
    id: 'src',
    type: 'groupNode',
    position: { x: 0, y: 0 },
    positionAbsolute: { x: 0, y: 0 },
    data: {},
  } as Node;
  const featuresGroup = {
    id: 'src/features',
    type: 'groupNode',
    position: { x: 10, y: 10 },
    positionAbsolute: { x: 10, y: 10 },
    data: {},
  } as Node;

  beforeEach(() => {
    capturedReactFlowProps = {};
    mockGetIntersectingNodes.mockReset();
    mockGetInternalNode.mockReset();
    mockGetNode.mockReset();
    vi.clearAllMocks();
  });

  const setupDragTest = (intersections: Node[]) => {
    const reparentNodeMock = vi.fn();

    const mockState = createMockGraphState({
      reparentNode: reparentNodeMock,
    });

    vi.mocked(storeModule.useGraphStore).mockImplementation(((selector?: (state: GraphState) => unknown) => {
      if (selector) {
        return selector(mockState);
      }
      return mockState;
    }) as typeof storeModule.useGraphStore);

    render(<DependencyGraph />);

    mockGetIntersectingNodes.mockReturnValue(intersections);

    const draggedNode = {
      id: 'node-1',
      type: 'appNode',
      parentId: 'src',
      position: { x: 50, y: 50 },
      positionAbsolute: { x: 50, y: 50 },
      data: { label: 'App.tsx' },
    } as Node;

    const getNodeImplementation = (id: string) => {
      if (id === 'src') return srcGroup;
      if (id === 'src/features') return featuresGroup;
      if (id === 'node-1') return draggedNode;
      return null;
    };

    mockGetInternalNode.mockImplementation(getNodeImplementation);
    mockGetNode.mockImplementation(getNodeImplementation);

    return { reparentNodeMock, draggedNode };
  };

  it('reparents correctly even when the current parent group appears first in intersections', () => {
    const { reparentNodeMock, draggedNode } = setupDragTest([srcGroup, featuresGroup]);

    // Invoke the handler
    expect(capturedReactFlowProps.onNodeDragStop).toBeDefined();
    capturedReactFlowProps.onNodeDragStop!(
        {} as React.MouseEvent,
        draggedNode
    );

    // Assert: picking 'src/features' because it has longer ID.
    expect(reparentNodeMock).toHaveBeenCalledWith('node-1', 'src/features', expect.any(Object));
  });

  it('reparents correctly if the desired group appears first', () => {
    const { reparentNodeMock, draggedNode } = setupDragTest([featuresGroup, srcGroup]);

    capturedReactFlowProps.onNodeDragStop!({} as React.MouseEvent, draggedNode);

    // It should pick 'src/features'
    expect(reparentNodeMock).toHaveBeenCalledWith('node-1', 'src/features', expect.any(Object));
  });

  it('unparents (moves to root) when dropped on canvas (no intersections)', () => {
    // Setup with empty intersections
    const { reparentNodeMock, draggedNode } = setupDragTest([]);

    // The dragged node has parentId='src' and positionAbsolute={ x: 50, y: 50 }
    // We expect it to be reparented to undefined with position { x: 50, y: 50 }

    capturedReactFlowProps.onNodeDragStop!({} as React.MouseEvent, draggedNode);

    expect(reparentNodeMock).toHaveBeenCalledWith('node-1', undefined, { x: 50, y: 50 });
  });
});
