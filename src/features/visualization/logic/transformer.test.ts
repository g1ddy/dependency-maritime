import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGraphFromCruiseResult, transformToReactFlow } from './transformer';
import { CruiseResultSchema, type ICruiseResult } from '../../../schema/dependency-cruiser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Graph Transformer Logic', () => {
  let sampleData: ICruiseResult;

  beforeAll(() => {
    // Load sample data
    const sampleDataPath = path.resolve(__dirname, '../../../../sample-data/dependency-graph.json');
    if (!fs.existsSync(sampleDataPath)) {
        throw new Error(`Sample data not found at: ${sampleDataPath}`);
    }
    const fileContent = fs.readFileSync(sampleDataPath, 'utf-8');
    const json: unknown = JSON.parse(fileContent);
    sampleData = CruiseResultSchema.parse(json);
  });

  it('should create a Graphology graph from cruise result', () => {
    const graph = createGraphFromCruiseResult(sampleData);

    expect(graph).toBeDefined();
    // Verify we have nodes
    expect(graph.order).toBeGreaterThan(0);
    // Use GreaterThanOrEqual because we might create external nodes not in the original module list
    expect(graph.order).toBeGreaterThanOrEqual(sampleData.modules.length);

    // Verify we have edges
    expect(graph.size).toBeGreaterThan(0);

    // Verify a specific node exists (e.g., src/App.tsx from known sample data)
    const appNode = graph.hasNode('src/App.tsx');
    expect(appNode).toBe(true);
  });

  it('should transform Graphology graph to React Flow primitives', () => {
    const graph = createGraphFromCruiseResult(sampleData);
    const { nodes, edges } = transformToReactFlow(graph);

    expect(nodes.length).toBe(graph.order);
    expect(edges.length).toBe(graph.size);

    const appNode = nodes.find(n => n.id === 'src/App.tsx');
    expect(appNode).toBeDefined();
    expect(appNode?.position).toEqual({ x: 0, y: 0 }); // Default position before layout
  });
});
