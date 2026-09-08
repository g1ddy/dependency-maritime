import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { generateDependencyGraph, readDependencyGraph } from './adapters';
import type { ViolationInput } from './architecture-debt';
import type { DependencyCruiserModule } from './models';
import type { MaritimeCruiseResult } from '../../schema/dependency-cruiser';

export interface ResolveAnalysisGraphOptions {
    suppliedGraphPath?: string;
    targetGraphPath: string;
    manifestDir: string;
    rawSources: string[];
    depcruiseConfig?: string;
    workingDir: string;
}

export interface ResolveAnalysisGraphResult {
    modules: DependencyCruiserModule[];
    graph: MaritimeCruiseResult;
    violations: ViolationInput[];
    effectiveGraphPath: string;
    stagedSuppliedGraph: boolean;
    configSource?: 'explicit' | 'discovered' | 'fallback';
}

async function writeCanonicalGraph(graphPath: string, graph: MaritimeCruiseResult): Promise<void> {
    await fsPromises.mkdir(path.dirname(graphPath), { recursive: true });
    await fsPromises.writeFile(graphPath, JSON.stringify(graph, null, 2));
}

function resolveCanonicalGraphPath(options: ResolveAnalysisGraphOptions, inputGraphPath: string): string {
    const requestedGraphPath = path.resolve(options.workingDir, options.targetGraphPath);
    if (requestedGraphPath !== inputGraphPath) {
        return requestedGraphPath;
    }

    return path.join(path.dirname(requestedGraphPath), `maritime-${path.basename(requestedGraphPath)}`);
}

export async function resolveAnalysisGraph(
    options: ResolveAnalysisGraphOptions
): Promise<ResolveAnalysisGraphResult> {
    if (options.suppliedGraphPath) {
        const readResult = await readDependencyGraph(options.suppliedGraphPath, options.workingDir);
        const inputGraphPath = path.resolve(options.workingDir, options.suppliedGraphPath);
        const effectiveGraphPath = resolveCanonicalGraphPath(options, inputGraphPath);

        // The supplied path is read-only caller input. Canonical evidence is always serialized to
        // a distinct output path after readDependencyGraph() validates and normalizes the graph.
        await writeCanonicalGraph(effectiveGraphPath, readResult.graph);

        return {
            modules: readResult.modules,
            graph: readResult.graph,
            violations: readResult.graph.summary.violations,
            effectiveGraphPath,
            stagedSuppliedGraph: true
        };
    }

    const generated = await generateDependencyGraph({
        sourceRoots: options.rawSources,
        configPath: options.depcruiseConfig,
        cwd: options.workingDir
    });
    const effectiveGraphPath = path.resolve(options.workingDir, options.targetGraphPath);
    await writeCanonicalGraph(effectiveGraphPath, generated.cruiseResult);

    return {
        modules: generated.modules,
        graph: generated.cruiseResult,
        violations: generated.cruiseResult.summary.violations,
        effectiveGraphPath,
        stagedSuppliedGraph: false,
        configSource: generated.configSource
    };
}
