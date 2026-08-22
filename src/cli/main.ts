import { parseArgs } from 'node:util';
import { runAnalyzeCommand } from './commands/analyze';

async function main() {
    const { positionals } = parseArgs({
        args: process.argv.slice(2),
        allowPositionals: true,
        strict: false
    });

    const command = positionals[0];

    if (command === 'analyze') {
        // Pass only the args meant for the analyze command
        const args = process.argv.slice(3);
        const exitCode = await runAnalyzeCommand(args);
        process.exit(exitCode);
    } else {
        console.error(`Unknown command: ${command || '(none)'}`);
        console.error('Available commands: analyze');
        process.exit(1);
    }
}

// Detect if we are the main module in ESM or CJS
const isMain = import.meta.url === `file://${process.argv[1]}` || (typeof require !== 'undefined' && require.main === module);

if (isMain) {
    main().catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
