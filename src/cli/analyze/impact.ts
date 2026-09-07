import { execSync } from 'node:child_process';
import type { DependencyCruiserModule } from './models';

export interface ImpactAnalysisOptions {
    baseRevision?: string;
    changedFiles?: string[];
    cwd?: string;
}

export interface ImpactAnalysisResult {
    baseRevision: string | null;
    directlyChangedFiles: string[];
    transitivelyAffectedFiles: string[];
    affectedFolders: string[];
    impactRatio: number;
}

export function getGitChangedFiles(baseRevision: string, cwd: string = process.cwd()): string[] {
    try {
        const output = execSync(`git diff --name-only ${baseRevision}`, { cwd, encoding: 'utf8' });
        return output.split('\n').map(s => s.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

export function calculateChangeImpact(
    modules: DependencyCruiserModule[],
    options: ImpactAnalysisOptions = {}
): ImpactAnalysisResult {
    const cwd = options.cwd || process.cwd();
    let directlyChanged: string[] = [];

    if (options.changedFiles && options.changedFiles.length > 0) {
        directlyChanged = options.changedFiles;
    } else if (options.baseRevision) {
        directlyChanged = getGitChangedFiles(options.baseRevision, cwd);
    }

    if (directlyChanged.length === 0) {
        return {
            baseRevision: options.baseRevision || null,
            directlyChangedFiles: [],
            transitivelyAffectedFiles: [],
            affectedFolders: [],
            impactRatio: 0
        };
    }

    const moduleMap = new Map<string, DependencyCruiserModule>();
    const dependentsMap = new Map<string, Set<string>>();

    for (const m of modules) {
        moduleMap.set(m.source, m);
        if (!dependentsMap.has(m.source)) {
            dependentsMap.set(m.source, new Set());
        }
        for (const dep of m.dependencies) {
            if (!dependentsMap.has(dep.resolved)) {
                dependentsMap.set(dep.resolved, new Set());
            }
            dependentsMap.get(dep.resolved)!.add(m.source);
        }
    }

    // Match directly changed files against modules in the graph
    const normalizedDirect = directlyChanged.map(f => f.replace(/\\/g, '/'));
    const directlyChangedInGraph = new Set<string>();

    for (const f of normalizedDirect) {
        if (moduleMap.has(f)) {
            directlyChangedInGraph.add(f);
        }
    }

    // BFS / Transitive closure for impacted modules
    const affectedSet = new Set<string>(directlyChangedInGraph);
    const queue = Array.from(directlyChangedInGraph);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const parents = dependentsMap.get(current);
        if (parents) {
            for (const parent of parents) {
                if (!affectedSet.has(parent)) {
                    affectedSet.add(parent);
                    queue.push(parent);
                }
            }
        }
    }

    const transitivelyAffected = Array.from(affectedSet).filter(f => !directlyChangedInGraph.has(f));

    // Extract impacted top-level/feature folders
    const affectedFoldersSet = new Set<string>();
    for (const f of affectedSet) {
        const parts = f.split('/');
        if (parts.length > 1) {
            affectedFoldersSet.add(parts.slice(0, 2).join('/'));
        } else {
            affectedFoldersSet.add(parts[0]);
        }
    }

    const totalGraphModules = modules.length;
    const impactRatio = totalGraphModules > 0 ? Number((affectedSet.size / totalGraphModules).toFixed(4)) : 0;

    return {
        baseRevision: options.baseRevision || null,
        directlyChangedFiles: Array.from(directlyChangedInGraph),
        transitivelyAffectedFiles: transitivelyAffected,
        affectedFolders: Array.from(affectedFoldersSet).sort(),
        impactRatio
    };
}
