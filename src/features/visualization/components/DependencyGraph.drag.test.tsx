import { render } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storeModule from '../store';
import React from 'react';

// We need to capture the props passed to ReactFlow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedReactFlowProps: any = {};
const mockGetIntersectingNodes = vi.fn();
const mockGetInternalNode = vi.fn();

// Mock @xyflow/react
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactFlow: (props: any) => {
      capturedReactFlowProps = props;
      return <div className="react-flow-mock">{props.children}</div>;
    },
    useReactFlow: () => ({
      getIntersectingNodes: mockGetIntersectingNodes,
      getInternalNode: mockGetInternalNode,
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

describe('DependencyGraph Drag Logic', () => {
  beforeEach(() => {
    capturedReactFlowProps = {};
    mockGetIntersectingNodes.mockReset();
    mockGetInternalNode.mockReset();
    vi.clearAllMocks();
  });

  it('reparents correctly even when the current parent group appears first in intersections', () => {
    const reparentNodeMock = vi.fn();
    const setGraphDataMock = vi.fn();

    const mockState = {
      nodes: [],
      edges: [],
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      setGraphData: setGraphDataMock,
      reparentNode: reparentNodeMock,
      selectNode: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storeModule.useGraphStore).mockReturnValue(mockState as any);

    render(<DependencyGraph />);

    // Define groups
    const srcGroup = { id: 'src', type: 'groupNode', positionAbsolute: { x: 0, y: 0 } };
    const featuresGroup = { id: 'src/features', type: 'groupNode', positionAbsolute: { x: 10, y: 10 } };

    // Setup intersections: 'src' comes FIRST (bad order for previous logic)
    // We are simulating dropping a node that is currently in 'src' onto 'src/features'.
    // Since 'src/features' is inside 'src', we intersect both.
    // The fix should sort these so 'src/features' (longer id) is picked.
    mockGetIntersectingNodes.mockReturnValue([srcGroup, featuresGroup]);

    // Mock getInternalNode to return positions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetInternalNode.mockImplementation((id: string) => {
        if (id === 'src') return srcGroup;
        if (id === 'src/features') return featuresGroup;
        return null;
    });

    const draggedNode = {
        id: 'node-1',
        type: 'appNode',
        parentId: 'src', // Currently in 'src'
        position: { x: 50, y: 50 },
        positionAbsolute: { x: 50, y: 50 },
        data: { label: 'App.tsx' }
    };

    // Invoke the handler
    // We expect onNodeDragStop to be passed to ReactFlow
    expect(capturedReactFlowProps.onNodeDragStop).toBeDefined();

    capturedReactFlowProps.onNodeDragStop(
        {} as React.MouseEvent,
        draggedNode
    );

    // Assert:
    // With fixed logic, it picks 'src/features' because it has longer ID.
    expect(reparentNodeMock).toHaveBeenCalledWith('node-1', 'src/features', expect.any(Object));
  });

  it('reparents correctly if the desired group appears first', () => {
    const reparentNodeMock = vi.fn();
    const setGraphDataMock = vi.fn();

    const mockState = {
      nodes: [],
      edges: [],
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      setGraphData: setGraphDataMock,
      reparentNode: reparentNodeMock,
      selectNode: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storeModule.useGraphStore).mockReturnValue(mockState as any);

    render(<DependencyGraph />);

    const srcGroup = { id: 'src', type: 'groupNode', positionAbsolute: { x: 0, y: 0 } };
    const featuresGroup = { id: 'src/features', type: 'groupNode', positionAbsolute: { x: 10, y: 10 } };

    // Setup intersections: 'src/features' comes FIRST (good order)
    mockGetIntersectingNodes.mockReturnValue([featuresGroup, srcGroup]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetInternalNode.mockImplementation((id: string) => {
        if (id === 'src') return srcGroup;
        if (id === 'src/features') return featuresGroup;
        return null;
    });

    const draggedNode = {
        id: 'node-1',
        type: 'appNode',
        parentId: 'src',
        position: { x: 50, y: 50 },
        positionAbsolute: { x: 50, y: 50 },
        data: { label: 'App.tsx' }
    };

    capturedReactFlowProps.onNodeDragStop({} as React.MouseEvent, draggedNode);

    // It should pick 'src/features'
    expect(reparentNodeMock).toHaveBeenCalledWith('node-1', 'src/features', expect.any(Object));
  });
});
