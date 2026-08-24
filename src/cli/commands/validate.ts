import { parseArgs } from 'node:util';
import * as path from 'node:path';
import { validateArtifacts } from '../validate/validate';
import { ValidationError } from '../analyze/models';

export async function runValidateCommand(args: string[]): Promise<number> {
    let values: {
        cwd?: string;
        help?: boolean;
    };
    let positionals: string[];

    try {
        const parsed = parseArgs({
            args,
            allowPositionals: true,
            options: {
                cwd: { type: 'string' },
                help: { type: 'boolean', short: 'h' }
            }
        });
        values = parsed.values;
        positionals = parsed.positionals;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error parsing arguments: ${message}`);
        return 2;
    }

    if (values.help) {
        console.log(`
Usage: maritime validate [directory] [options]

Arguments:
  [directory]               Artifact directory containing manifest.json (default: ".maritime")

Options:
  --cwd <dir>               Working directory root for resolution
  -h, --help                Show help message

Examples:
  maritime validate
  maritime validate .maritime
  maritime validate artifacts/maritime-output

Exit Codes:
  0 - Valid artifact directory contract
  1 - Operational or runtime failure
  2 - Invalid CLI arguments, missing/malformed manifest, path escaping, or schema mismatch
        `);
        return 0;
    }

    const artifactDirArg = positionals[0] || '.maritime';
    const workingDir = values.cwd ? path.resolve(values.cwd) : process.cwd();

    try {
        console.log(`🔍 Validating Maritime artifact directory: ${artifactDirArg}...`);
        const result = await validateArtifacts({
            artifactDir: artifactDirArg,
            cwd: workingDir
        });

        console.log('✅ Artifact Directory Contract Validated!');
        console.log(`   - Schema Version: ${result.manifest.schemaVersion}`);
        console.log(`   - Tool Version: ${result.manifest.toolVersion}`);
        console.log(`   - Generated At: ${result.manifest.generatedAt}`);
        console.log(`   - Source Roots: ${result.manifest.sourceRoots.join(', ')}`);
        console.log(`   - Total Files: ${result.manifest.summary.totalFiles}`);
        console.log(`   - Health Score: ${result.manifest.summary.healthScore}`);
        return 0;

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`Error validating artifacts: ${message}`);

        if (e instanceof ValidationError) {
            return 2;
        }
        return 1;
    }
}
