import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from './store';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CruiseResultSchema, type ICruiseResult } from '../../schema/dependency-cruiser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Visualization Store', () => {
  let sampleData: ICruiseResult;

  beforeEach(() => {
    // Reset store
    useGraphStore.getState().reset();

    // Load sample data
    const sampleDataPath = path.resolve(__dirname, '../../../sample-data/dependency-graph.json');
    if (!fs.existsSync(sampleDataPath)) {
         // Fallback if sample data missing in test env (shouldn't happen in this repo)
         // We construct a minimal valid object to satisfy TS, though tests depending on real data might fail if this branch is hit
         sampleData = { modules: [], summary: {
             violations: [],
             error: 0,
             warn: 0,
             info: 0,
             totalCruised: 0,
             totalDependenciesCruised: 0
         } };
    } else {
        const fileContent = fs.readFileSync(sampleDataPath, 'utf-8');
        const json: unknown = JSON.parse(fileContent);
        sampleData = CruiseResultSchema.parse(json);
    }
  });

  it('should initialize with empty state', () => {
    const state = useGraphStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.graph).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('should set graph data and generate nodes/edges', () => {
    const store = useGraphStore.getState();
    store.setGraphData(sampleData);

    const newState = useGraphStore.getState();
    expect(newState.nodes.length).toBeGreaterThan(0);
    expect(newState.edges.length).toBeGreaterThan(0);
    expect(newState.graph).not.toBeNull();

    // Check if layout was applied (positions shouldn't be all 0,0)
    // Note: Layout depends on Dagre. The root node usually has some position.
    // In Dagre, top-left might be shifted.
    const nonZeroPos = newState.nodes.some(n => n.position.x !== 0 || n.position.y !== 0);
    expect(nonZeroPos).toBe(true);
  });

  it('should reset state', () => {
    const store = useGraphStore.getState();
    store.setGraphData(sampleData);
    expect(useGraphStore.getState().nodes.length).toBeGreaterThan(0);

    store.reset();
    expect(useGraphStore.getState().nodes).toEqual([]);
    expect(useGraphStore.getState().graph).toBeNull();
  });
});
