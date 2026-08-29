import { parseArgs } from 'node:util';
import { runAnalyzeCommand } from './commands/analyze';
import { runValidateCommand } from './commands/validate';
import { runGraphCommand } from './commands/graph';

async function main() {
    const { positionals } = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        strict: false
    });

    const command = positionals[0];

    if (command === 'analyze') {
        const args = process.argv.slice(3);
        const exitCode = await runAnalyzeCommand(args);
        process.exit(exitCode);
    } else if (command === 'validate') {
        const args = process.argv.slice(3);
        const exitCode = await runValidateCommand(args);
        process.exit(exitCode);
    } else if (command === 'graph') {
        const exitCode = await runGraphCommand(process.argv.slice(3));
        process.exit(exitCode);
    } else {
        console.error(`Unknown command: ${command || '(none)'}`);
        console.error('Available commands: analyze, validate, graph');
        process.exit(1);
    }
}

import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';

let isMain = false;
if (process.argv[1]) {
    try {
        const currentPath = fileURLToPath(import.meta.url);
        const execPath = process.argv[1];
        isMain = currentPath === execPath || currentPath === fs.realpathSync(execPath);
    } catch {
        isMain = false;
    }
}

if (isMain) {
    main().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
