import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './store';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CruiseResultSchema, type ICruiseResult } from '../../schema/dependency-cruiser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    expect(node).toBeDefined();
    if (!node) return;

    // Check initial state
    // 'src/App.tsx' should have a parent 'src' (if 'src' group exists)
    // Actually in `transformer.ts`, parentId is set to directory path.
    expect(node.parentId).toBe('src');
    expect(node.data.fullPath).toBe('src/App.tsx');

    // Move to root
    store.reparentNode(node.id, undefined, { x: 100, y: 100 });

    state = useGraphStore.getState();
    const updatedNode = state.nodes.find(n => n.id === node.id);
    expect(updatedNode).toBeDefined();

    // Verify parentId is undefined
    expect(updatedNode?.parentId).toBeUndefined();

    // Verify fullPath is updated to just 'App.tsx' (since it's at root now)
    expect(updatedNode?.data.fullPath).toBe('App.tsx');
  });
});
