const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration matching the old script
const SRC_DIR = 'src';
const DOCS_FILE = 'docs/COMPLEXITY.md';
const DEP_GRAPH_JSON = 'config/dependency-graph.json';
const METRICS_JSON_FILE = 'config/complexity-metrics.json';
const REPORT_TMP_FILE = 'config/complexity-report-tmp.md';

function main() {
    console.log('🔄 Running legacy calculate-complexity shim...');

    try {
        if (!fs.existsSync(DEP_GRAPH_JSON)) {
            console.error(`❌ Dependency graph JSON not found at ${DEP_GRAPH_JSON}. Run 'pnpm run generate:json' first.`);
            process.exit(1);
        }

        // Run the new CLI tool using tsx since we haven't built the typescript yet for the CLI
        const cmd = `npx tsx src/cli/main.ts analyze --source ${SRC_DIR} --graph ${DEP_GRAPH_JSON} --metrics ${METRICS_JSON_FILE} --report ${REPORT_TMP_FILE}`;
        execSync(cmd, { stdio: 'inherit' });

        // Update the DOCS_FILE by appending the newly generated markdown report
        // This preserves the old behavior of replacing the report in docs/COMPLEXITY.md
        console.log(`   - Updating ${DOCS_FILE}...`);

        let currentContent = fs.readFileSync(DOCS_FILE, 'utf8');
        const MARKER_START = '## 🚨 Automated Complexity Report';

        if (currentContent.includes(MARKER_START)) {
            const parts = currentContent.split(MARKER_START);
            currentContent = parts[0];
        }

        const reportContent = fs.readFileSync(REPORT_TMP_FILE, 'utf8');

        // Remove the temporary marker file since the real one includes the H2 header
        const newContent = currentContent.trim() + '\n\n' + reportContent;
        fs.writeFileSync(DOCS_FILE, newContent);

        // Clean up temp file
        fs.unlinkSync(REPORT_TMP_FILE);

        console.log('✅ Complexity Report Updated and Metrics Exported (via CLI shim)!');
    } catch (e) {
        console.error('Failed to run complexity analysis', e);
        process.exit(1);
    }
}

main();
