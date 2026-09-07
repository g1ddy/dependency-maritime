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
    configSource?: 'explicit' | 'discovered' | 'fallback';
}

async function writeCanonicalGraph(graphPath: string, graph: MaritimeCruiseResult): Promise<void> {
    await fsPromises.mkdir(path.dirname(graphPath), { recursive: true });
    await fsPromises.writeFile(graphPath, JSON.stringify(graph, null, 2));
}

export async function resolveAnalysisGraph(
    options: ResolveAnalysisGraphOptions
): Promise<ResolveAnalysisGraphResult> {
    if (options.suppliedGraphPath) {
        const readResult = await readDependencyGraph(options.suppliedGraphPath, options.workingDir);
        const inputGraphPath = path.resolve(options.workingDir, options.suppliedGraphPath);
        const relGraphToManifest = path.relative(options.manifestDir, inputGraphPath);
        const isOutsideArtifactDir = relGraphToManifest.startsWith('..') || path.isAbsolute(relGraphToManifest);
        const effectiveGraphPath = isOutsideArtifactDir
            ? path.join(options.manifestDir, path.basename(inputGraphPath))
            : inputGraphPath;

        // Never copy raw Dependency-Cruiser bytes into canonical evidence. readDependencyGraph()
        // validates and normalizes first, and the artifact bundle always receives that normalized shape.
        await writeCanonicalGraph(effectiveGraphPath, readResult.graph);

        return {
            modules: readResult.modules,
            graph: readResult.graph,
            violations: readResult.graph.summary.violations,
            effectiveGraphPath
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
        configSource: generated.configSource
    };
}
