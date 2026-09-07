import { describe, it, expect } from 'vitest';
import { calculateChangeImpact } from './impact';
import type { DependencyCruiserModule } from './models';

describe('calculateChangeImpact', () => {
    const mockModules: DependencyCruiserModule[] = [
        {
            source: 'src/components/Button.tsx',
            dependencies: [],
            dependents: ['src/components/Header.tsx']
        },
        {
            source: 'src/components/Header.tsx',
            dependencies: [{ resolved: 'src/components/Button.tsx' }],
            dependents: ['src/App.tsx']
        },
        {
            source: 'src/App.tsx',
            dependencies: [{ resolved: 'src/components/Header.tsx' }],
            dependents: []
        },
        {
            source: 'src/utils/math.ts',
            dependencies: [],
            dependents: []
        }
    ];

    it('calculates direct, transitive, folder, and ratio impact correctly', () => {
        const result = calculateChangeImpact(mockModules, {
            changedFiles: ['src/components/Button.tsx']
        });

        expect(result.directlyChangedFiles).toEqual(['src/components/Button.tsx']);
        expect(result.transitivelyAffectedFiles).toEqual(['src/components/Header.tsx', 'src/App.tsx']);
        expect(result.affectedFolders).toEqual(['src/App.tsx', 'src/components']);
        expect(result.impactRatio).toBe(0.75); // 3 affected out of 4 total modules
    });

    it('returns 0 impact when changed files do not exist in graph', () => {
        const result = calculateChangeImpact(mockModules, {
            changedFiles: ['README.md']
        });

        expect(result.directlyChangedFiles).toEqual([]);
        expect(result.transitivelyAffectedFiles).toEqual([]);
        expect(result.impactRatio).toBe(0);
    });
});
