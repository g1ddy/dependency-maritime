import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphStore } from './store';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CruiseResultSchema, type ICruiseResult } from '../../schema/dependency-cruiser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock layout logic to speed up tests
vi.mock('./logic/layout', () => ({
  applyDagreLayout: (nodes: any[], edges: any[]) => ({
    nodes: nodes.map(n => ({ ...n, position: { x: 0, y: 0 } })),
    edges
  })
}));

describe('Reparenting Logic', () => {
  let sampleData: ICruiseResult;

  beforeEach(() => {
    useGraphStore.getState().reset();
    const sampleDataPath = path.resolve(__dirname, '../../../sample-data/dependency-graph.json');
    const fileContent = fs.readFileSync(sampleDataPath, 'utf-8');
    sampleData = CruiseResultSchema.parse(JSON.parse(fileContent));
  });

  it('should update fullPath when moving node from group to root', () => {
    const store = useGraphStore.getState();
    store.setGraphData(sampleData);

    let state = useGraphStore.getState();
    // Find 'src/App.tsx' node. The ID is a GUID, so search by label or fullPath.
    const node = state.nodes.find(n => n.data.fullPath === 'src/App.tsx');

    // Fail test immediately if node is missing, avoids silent pass if expectations were removed
    if (!node) {
        throw new Error('Test node src/App.tsx not found in sample data');
    }

    // Check initial state
    // 'src/App.tsx' should have a parent 'src' (if 'src' group exists)
    // Actually in `transformer.ts`, parentId is set to directory path.
    expect(node.parentId).toBe('src');
    expect(node.data.fullPath).toBe('src/App.tsx');

    // Move to root
    store.reparentNode(node.id, undefined, { x: 100, y: 100 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    if (!updatedNode) {
        throw new Error('Updated node not found');
    }

    // Verify parentId is undefined
    expect(updatedNode.parentId).toBeUndefined();

    // Verify fullPath is updated to just 'App.tsx' (since it's at root now)
    expect(updatedNode.data.fullPath).toBe('App.tsx');

    // Verify extent behavior (undefined for root)
    expect(updatedNode.extent).toBeUndefined();
  });

  it('should update fullPath when moving node into a group', () => {
    const store = useGraphStore.getState();
    store.setGraphData(sampleData);

    let state = useGraphStore.getState();
    const node = state.nodes.find(n => n.data.fullPath === 'src/App.tsx');

    if (!node) {
        throw new Error('Test node src/App.tsx not found');
    }

    // Move to 'src/pages' group (assuming it exists in sample data or we create it logic wise)
    // In sample data: src/pages/GamePage.tsx exists, so src/pages group should exist.
    const newParentId = 'src/pages';

    store.reparentNode(node.id, newParentId, { x: 50, y: 50 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);

    if (!updatedNode) {
        throw new Error('Updated node not found');
    }

    // Verify parentId
    expect(updatedNode.parentId).toBe(newParentId);

    // Verify fullPath is updated
    expect(updatedNode.data.fullPath).toBe('src/pages/App.tsx');

    // Verify extent behavior (currently undefined in implementation, but reviewer suggested checking it)
    // The current implementation in store.ts sets extent: undefined for newParentId too?
    // Let's check the code: extent: newParentId ? undefined : undefined
    // So it is always undefined.
    expect(updatedNode.extent).toBeUndefined();
  });
});
