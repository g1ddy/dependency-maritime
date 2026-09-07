import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { readDependencyGraph, generateDependencyGraph } from './adapters';
import type { DependencyCruiserModule } from './models';

export interface ResolveGraphInputOptions {
    graphPath?: string;
    targetGraphPath: string;
    rawSources: string[];
    depcruiseConfig?: string;
    manifestDir: string;
    workingDir: string;
}

export interface GraphInputResult {
    modules: DependencyCruiserModule[];
    effectiveGraphPath: string;
    isGraphSupplied: boolean;
    configSource?: string;
}

export async function resolveGraphInput(options: ResolveGraphInputOptions): Promise<GraphInputResult> {
    const { graphPath, targetGraphPath, rawSources, depcruiseConfig, manifestDir, workingDir } = options;
    const isGraphSupplied = graphPath !== undefined;
    let modules: DependencyCruiserModule[];
    let effectiveGraphPath: string;
    let configSource: string | undefined;

    if (isGraphSupplied) {
        console.log('   - Reading Supplied Dependency Cruiser JSON...');
        modules = await readDependencyGraph(graphPath!, workingDir);

        const absGraphPath = path.resolve(workingDir, graphPath!);
        const relGraphToManifest = path.relative(manifestDir, absGraphPath);
        const isOutside = relGraphToManifest.startsWith('..') || path.isAbsolute(relGraphToManifest);

        if (isOutside) {
            console.log('   - Staging supplied graph into artifact directory...');
            effectiveGraphPath = path.join(manifestDir, path.basename(absGraphPath));
            try {
                await fsPromises.mkdir(manifestDir, { recursive: true });
                await fsPromises.copyFile(absGraphPath, effectiveGraphPath);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to stage supplied dependency graph into artifact directory: ${message}`);
            }
        } else {
            effectiveGraphPath = absGraphPath;
        }
    } else {
        console.log('   - Generating Dependency Graph with dependency-cruiser...');
        const genResult = await generateDependencyGraph({
            sourceRoots: rawSources,
            configPath: depcruiseConfig,
            cwd: workingDir
        });
        configSource = genResult.configSource;
        console.log(`   - Dependency-Cruiser Config Source: ${configSource}`);
        modules = genResult.modules;

        effectiveGraphPath = path.resolve(workingDir, targetGraphPath);
        await fsPromises.mkdir(path.dirname(effectiveGraphPath), { recursive: true });
        await fsPromises.writeFile(effectiveGraphPath, JSON.stringify(genResult.cruiseResult, null, 2));
    }

    return {
        modules,
        effectiveGraphPath,
        isGraphSupplied,
        configSource
    };
}
