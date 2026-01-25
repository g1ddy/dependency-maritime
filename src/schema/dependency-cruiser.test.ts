import { describe, it, expect } from 'vitest';
import { CruiseResultSchema } from './dependency-cruiser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dependency Cruiser Schema', () => {
  it('should validate the sample data', () => {
    const sampleDataPath = path.resolve(__dirname, '../../sample-data/dependency-graph.json');

    // Check if file exists to avoid confusing errors
    if (!fs.existsSync(sampleDataPath)) {
        throw new Error(`Sample data not found at: ${sampleDataPath}`);
    }

    const fileContent = fs.readFileSync(sampleDataPath, 'utf-8');
    const json: unknown = JSON.parse(fileContent);

    const result = CruiseResultSchema.safeParse(json);

    if (!result.success) {
      console.error('Schema Validation Error:', JSON.stringify(result.error.format(), null, 2));
    }

    expect(result.success).toBe(true);

    if (result.success) {
        expect(result.data.modules.length).toBeGreaterThan(0);
        // Spot check a known module
        const appModule = result.data.modules.find(m => m.source === 'src/App.tsx');
        expect(appModule).toBeDefined();
        expect(appModule?.dependencies.length).toBeGreaterThan(0);
    }
  });
});
