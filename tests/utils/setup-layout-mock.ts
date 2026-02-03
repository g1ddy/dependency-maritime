import { vi } from 'vitest';
import { type Node, type Edge } from '@xyflow/react';

// Mock layout logic to speed up tests
// We mock it globally so individual tests don't need to repeat it
vi.mock('@/features/visualization/logic/layout', () => ({
  applyDagreLayout: (nodes: Node[], edges: Edge[]) => ({
    nodes: nodes.map(n => ({ ...n, position: { x: 0, y: 0 } })),
    edges
  })
}));

vi.mock('@/features/visualization/logic/layout-elk', () => ({
  applyElkLayout: async (nodes: Node[], edges: Edge[]) => {
    await Promise.resolve(); // Simulate async
    return {
      nodes: nodes.map(n => ({ ...n, position: { x: 0, y: 0 } })),
      edges
    };
  }
}));
