import { describe, it, expect, vi } from 'vitest';
import { calculateChangeImpact, getGitChangedFiles } from './impact';
import { ValidationError, type DependencyCruiserModule } from './models';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => {
    const fn = vi.fn();
    return {
        default: { execFileSync: fn },
        execFileSync: fn
    };
});

describe('impact analysis', () => {
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

    describe('getGitChangedFiles', () => {
        it('uses execFileSync without shell interpolation', () => {
            vi.spyOn(childProcess, 'execFileSync').mockReturnValue('src/components/Button.tsx\nREADME.md\n');
            const result = getGitChangedFiles('main');

            expect(childProcess.execFileSync).toHaveBeenCalledWith('git', ['diff', '--name-only', 'main', '--'], expect.any(Object));
            expect(result).toEqual(['src/components/Button.tsx', 'README.md']);
        });

        it('throws ValidationError if git command fails', () => {
            vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
                throw new Error('fatal: ambiguous argument');
            });

            expect(() => getGitChangedFiles('invalid-rev')).toThrow(ValidationError);
        });
    });

    describe('calculateChangeImpact', () => {
        it('calculates git, direct, transitive, folder, and ratio impact correctly', () => {
            const result = calculateChangeImpact(mockModules, {
                changedFiles: ['src/components/Button.tsx', 'README.md']
            });

            expect(result.gitChangedFiles).toEqual(['src/components/Button.tsx', 'README.md']);
            expect(result.directlyChangedFiles).toEqual(['src/components/Button.tsx']);
            expect(result.transitivelyAffectedFiles).toEqual(['src/components/Header.tsx', 'src/App.tsx']);
            expect(result.affectedFolders).toEqual(['src', 'src/components']);
            expect(result.impactRatio).toBe(0.75); // 3 affected graph modules out of 4 total
        });
    });
});
