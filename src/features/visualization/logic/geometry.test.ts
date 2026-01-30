import { describe, it, expect } from 'vitest';
import { type Node } from '@xyflow/react';
import { isNodeCenterInside } from './geometry';

describe('isNodeCenterInside', () => {
  const containerNode: Node = {
    id: 'container',
    position: { x: 0, y: 0 },
    positionAbsolute: { x: 100, y: 100 },
    width: 200,
    height: 200,
    data: {},
  };

  const createNode = (x: number, y: number, width = 50, height = 50): Node => ({
    id: 'node',
    position: { x: 0, y: 0 },
    positionAbsolute: { x, y },
    width,
    height,
    data: {},
  });

  it('returns true when node is fully inside container', () => {
    // Container is at 100,100 with size 200x200 -> bounds: 100-300, 100-300
    // Node at 150,150 with size 50x50 -> center at 175,175. Inside.
    const node = createNode(150, 150);
    expect(isNodeCenterInside(node, containerNode)).toBe(true);
  });

  it('returns true when node center is inside but edges stick out', () => {
    // Node at 80,150 with size 50x50 -> center at 105,175.
    // Container Left is 100. Center 105 is inside.
    const node = createNode(80, 150);
    expect(isNodeCenterInside(node, containerNode)).toBe(true);
  });

  it('returns false when node center is just outside container', () => {
    // Node at 70,150 with size 50x50 -> center at 95,175.
    // Container Left is 100. Center 95 is outside.
    const node = createNode(70, 150);
    expect(isNodeCenterInside(node, containerNode)).toBe(false);
  });

  it('returns false when node is fully outside', () => {
    const node = createNode(400, 400);
    expect(isNodeCenterInside(node, containerNode)).toBe(false);
  });

  it('handles nodes using measured dimensions', () => {
    const measuredContainer: Node = {
        ...containerNode,
        width: undefined,
        height: undefined,
        measured: { width: 200, height: 200 },
    };

    const measuredNode: Node = {
        ...createNode(150, 150),
        width: undefined,
        height: undefined,
        measured: { width: 50, height: 50 },
    };

    expect(isNodeCenterInside(measuredNode, measuredContainer)).toBe(true);
  });
});
