import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyDagreLayout } from './layout';
import { type Node, type Edge, Position } from '@xyflow/react';

// Unmock the module under test because it is globally mocked in setup-layout-mock.ts
vi.unmock('./layout');

// Use vi.hoisted to share mocks between the mock factory and the tests
const mocks = vi.hoisted(() => {
  return {
    setGraph: vi.fn(),
    setDefaultEdgeLabel: vi.fn(),
    setNode: vi.fn(),
    setEdge: vi.fn(),
    setParent: vi.fn(),
    node: vi.fn(),
    layout: vi.fn(),
    Graph: vi.fn(),
  };
});

vi.mock('dagre', () => {
  // The Graph constructor returns an object with the methods
  const GraphImplementation = function() {
    return {
      setGraph: mocks.setGraph,
      setDefaultEdgeLabel: mocks.setDefaultEdgeLabel,
      setNode: mocks.setNode,
      setEdge: mocks.setEdge,
      setParent: mocks.setParent,
      node: mocks.node,
    };
  };

  const mockExports = {
    graphlib: {
      Graph: mocks.Graph.mockImplementation(GraphImplementation),
    },
    layout: mocks.layout,
  };

  return {
    ...mockExports,
    default: mockExports,
  };
});

describe('applyDagreLayout', () => {

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior for node() to avoid crashes if not specified
    mocks.node.mockReturnValue({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('should return empty nodes and edges for empty input', () => {
    const { nodes, edges } = applyDagreLayout([], []);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it('should set graph defaults and direction', () => {
    applyDagreLayout([], [], { direction: 'LR' });
    expect(mocks.setGraph).toHaveBeenCalledWith({ rankdir: 'LR' });
    expect(mocks.setDefaultEdgeLabel).toHaveBeenCalled();
  });

  it('should process a single node with default dimensions', () => {
    const nodes: Node[] = [{ id: '1', position: { x: 0, y: 0 }, data: {} }];

    // Mock dagre.node() return value
    mocks.node.mockReturnValue({ x: 100, y: 50, width: 180, height: 40 });

    const { nodes: layoutedNodes } = applyDagreLayout(nodes, [], { direction: 'TB' });

    // Verify setNode called with default dimensions (180x40)
    expect(mocks.setNode).toHaveBeenCalledWith('1', { width: 180, height: 40 });

    // Verify position calculation
    // Dagre returns center (100, 50), width 180, height 40
    // Top-left = 100 - 90 = 10; 50 - 20 = 30
    expect(layoutedNodes[0].position).toEqual({ x: 10, y: 30 });
    expect(layoutedNodes[0].targetPosition).toBe(Position.Top);
    expect(layoutedNodes[0].sourcePosition).toBe(Position.Bottom);
  });

  it('should prioritize measured dimensions over others', () => {
    const nodes: Node[] = [{
      id: '1',
      position: { x: 0, y: 0 },
      data: {},
      measured: { width: 200, height: 100 },
      style: { width: 50, height: 50 }
    }];

    mocks.node.mockReturnValue({ x: 0, y: 0, width: 200, height: 100 });

    applyDagreLayout(nodes, [], { nodeWidth: 300 });

    expect(mocks.setNode).toHaveBeenCalledWith('1', { width: 200, height: 100 });
  });

  it('should fallback to options and then defaults', () => {
    const nodes: Node[] = [{ id: '1', position: { x: 0, y: 0 }, data: {} }];
    mocks.node.mockReturnValue({ x: 0, y: 0, width: 150, height: 60 });

    applyDagreLayout(nodes, [], { nodeWidth: 150, nodeHeight: 60 });

    expect(mocks.setNode).toHaveBeenCalledWith('1', { width: 150, height: 60 });
  });

  it('should handle edges', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} }
    ];
    const edges: Edge[] = [{ id: 'e1', source: '1', target: '2' }];

    mocks.node.mockReturnValue({ x: 0, y: 0, width: 100, height: 50 });

    applyDagreLayout(nodes, edges);

    expect(mocks.setEdge).toHaveBeenCalledWith('1', '2');
  });

  it('should calculate relative positions for child nodes (Compound Graph)', () => {
    const parentId = 'group1';
    const childId = 'child1';

    const nodes: Node[] = [
      { id: parentId, position: { x: 0, y: 0 }, data: {}, type: 'groupNode' },
      { id: childId, position: { x: 0, y: 0 }, data: {}, parentId: parentId, extent: 'parent' }
    ];

    // Setup Mock Returns
    mocks.node.mockImplementation((id: string) => {
      if (id === parentId) {
        // Parent at Center (200, 200), W=400, H=400
        // Parent Top-Left = (0, 0)
        return { x: 200, y: 200, width: 400, height: 400 };
      }
      if (id === childId) {
        // Child at Center (100, 100), W=100, H=50
        // Child Absolute Top-Left = (50, 75)
        return { x: 100, y: 100, width: 100, height: 50 };
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    });

    const { nodes: layoutedNodes } = applyDagreLayout(nodes, []);

    expect(mocks.setParent).toHaveBeenCalledWith(childId, parentId);

    const parentNode = layoutedNodes.find(n => n.id === parentId);
    const childNode = layoutedNodes.find(n => n.id === childId);

    expect(parentNode).toBeDefined();
    expect(childNode).toBeDefined();

    // Check Parent Position (Absolute)
    // Center (200, 200) - Half (200, 200) = (0, 0)
    expect(parentNode!.position).toEqual({ x: 0, y: 0 });

    // Check Child Position (Relative to Parent)
    // Child Absolute: Center (100, 100) - Half (50, 25) = (50, 75)
    // Relative = Child Absolute (50, 75) - Parent Absolute (0, 0) = (50, 75)
    expect(childNode!.position).toEqual({ x: 50, y: 75 });
  });

  it('should update group node style dimensions', () => {
    const nodes: Node[] = [{ id: 'g1', position: { x: 0, y: 0 }, data: {}, type: 'groupNode', style: { backgroundColor: 'red' } }];

    mocks.node.mockReturnValue({ x: 100, y: 100, width: 500, height: 300 });

    const { nodes: layoutedNodes } = applyDagreLayout(nodes, []);

    const groupNode = layoutedNodes[0];
    expect(groupNode.style).toEqual({
      backgroundColor: 'red',
      width: 500,
      height: 300
    });
  });

  it('should handle missing parent gracefully', () => {
    // A child with a parentId, but the parent node is not in the list
    const nodes: Node[] = [
      { id: 'child1', position: { x: 0, y: 0 }, data: {}, parentId: 'missing-parent' }
    ];

    mocks.node.mockReturnValue({ x: 100, y: 100, width: 100, height: 100 });

    // Should verify console.warn, but mostly ensure it doesn't crash
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { nodes: layoutedNodes } = applyDagreLayout(nodes, []);

    // If parent is missing, it cannot calculate relative, so it should use absolute calculated
    // Center (100,100) -> TopLeft (50, 50)
    expect(layoutedNodes[0].position).toEqual({ x: 50, y: 50 });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
