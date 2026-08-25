import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { ArtifactManifestSchema, MANIFEST_SCHEMA_VERSION, type ArtifactManifest } from '../../schema/manifest';
import { CruiseResultSchema } from '../../schema/dependency-cruiser';
import { ComplexityMetricsMapSchema } from '../../schema/complexity-metrics';
import { ValidationError } from '../analyze/models';

export interface ValidateArtifactsOptions {
    artifactDir?: string;
    cwd?: string;
}

export interface ValidateArtifactsResult {
    manifest: ArtifactManifest;
    artifactDir: string;
}

export async function validateArtifacts(options: ValidateArtifactsOptions = {}): Promise<ValidateArtifactsResult> {
    const workingDir = options.cwd ? path.resolve(options.cwd) : process.cwd();
    const artifactDirRelative = options.artifactDir ?? '.maritime';
    const artifactDir = path.resolve(workingDir, artifactDirRelative);

    try {
        const stat = await fsPromises.stat(artifactDir);
        if (!stat.isDirectory()) {
            throw new ValidationError(`Artifact path is not a directory: ${artifactDirRelative}`);
        }
    } catch (err: unknown) {
        if (err instanceof ValidationError) throw err;
        throw new ValidationError(`Artifact directory not found: ${artifactDirRelative}`);
    }

    const manifestPath = path.join(artifactDir, 'manifest.json');
    let manifestRaw: string;
    try {
        manifestRaw = await fsPromises.readFile(manifestPath, 'utf8');
    } catch {
        throw new ValidationError(`Missing manifest file: ${path.relative(workingDir, manifestPath)}`);
    }

    let manifestJson: unknown;
    try {
        manifestJson = JSON.parse(manifestRaw);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new ValidationError(`Malformed JSON in manifest file ${path.relative(workingDir, manifestPath)}: ${message}`);
    }

    const manifestParse = ArtifactManifestSchema.safeParse(manifestJson);
    if (!manifestParse.success) {
        // Check if version mismatch
        const rawObj = manifestJson as Record<string, unknown> | null;
        if (rawObj && typeof rawObj === 'object' && 'schemaVersion' in rawObj && typeof rawObj.schemaVersion === 'string' && rawObj.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
            throw new ValidationError(
                `Unsupported manifest schemaVersion "${rawObj.schemaVersion}". Supported schemaVersion is "${MANIFEST_SCHEMA_VERSION}".`
            );
        }
        throw new ValidationError(`Invalid manifest structure in ${path.relative(workingDir, manifestPath)}:\n${manifestParse.error.message}`);
    }

    const manifest = manifestParse.data;

    // Verify artifact paths and ensure they do not escape artifactDir
    const artifactKeys = ['graph', 'metrics', 'report'] as const;
    for (const key of artifactKeys) {
        const declaredPath = manifest.artifacts[key];
        const resolvedPath = path.resolve(artifactDir, declaredPath);

        const rel = path.relative(artifactDir, resolvedPath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new ValidationError(`Manifest artifact path for "${key}" escapes the artifact directory: "${declaredPath}"`);
        }

        try {
            await fsPromises.access(resolvedPath);
        } catch {
            throw new ValidationError(`Declared artifact file for "${key}" not found: ${declaredPath}`);
        }

        if (key === 'graph') {
            let graphRaw: string;
            try {
                graphRaw = await fsPromises.readFile(resolvedPath, 'utf8');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new ValidationError(`Failed to read graph file ${declaredPath}: ${message}`);
            }

            let graphJson: unknown;
            try {
                graphJson = JSON.parse(graphRaw);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new ValidationError(`Invalid JSON in graph file ${declaredPath}: ${message}`);
            }

            const graphParse = CruiseResultSchema.safeParse(graphJson);
            if (!graphParse.success) {
                throw new ValidationError(`Invalid dependency-cruiser graph schema in ${declaredPath}:\n${graphParse.error.message}`);
            }
        }

        if (key === 'metrics') {
            let metricsRaw: string;
            try {
                metricsRaw = await fsPromises.readFile(resolvedPath, 'utf8');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new ValidationError(`Failed to read metrics file ${declaredPath}: ${message}`);
            }

            let metricsJson: unknown;
            try {
                metricsJson = JSON.parse(metricsRaw);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new ValidationError(`Invalid JSON in metrics file ${declaredPath}: ${message}`);
            }

            const metricsParse = ComplexityMetricsMapSchema.safeParse(metricsJson);
            if (!metricsParse.success) {
                throw new ValidationError(`Invalid complexity metrics schema in ${declaredPath}:\n${metricsParse.error.message}`);
            }
        }
    }

    return {
        manifest,
        artifactDir
    };
}
