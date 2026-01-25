const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = 'src';
const DOCS_FILE = 'docs/COMPLEXITY.md';
const DEP_GRAPH_JSON = 'config/dependency-graph.json';

// Thresholds for "Repo Health" Penalties
const THRESHOLDS = {
    LOC: 300,
    COMPLEXITY: 10,
    FAN_OUT: 15,
    INSTABILITY_MIN: 0.3,
    INSTABILITY_MAX: 0.7
};

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
        // ESLint exits with 1 if there are warnings, but we just want the output
        if (e.stdout) return e.stdout;
        console.error(`Command failed: ${cmd}`);
        return '';
    }
}

function getLoc(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch (e) {
        return 0;
    }
}

function main() {
    console.log('📊 Starting Complexity Analysis...');

    // 1. Dependency Cruiser (Fan-In, Fan-Out, Instability)
    console.log('   - Reading Dependency Cruiser JSON...');
    let modules = [];
    try {
        if (fs.existsSync(DEP_GRAPH_JSON)) {
            const data = JSON.parse(fs.readFileSync(DEP_GRAPH_JSON, 'utf8'));
            modules = data.modules || [];
        } else {
            console.error(`❌ Dependency graph JSON not found at ${DEP_GRAPH_JSON}. Run 'npm run generate:json' first.`);
            process.exit(1);
        }
    } catch (e) {
        console.error('Failed to parse Dependency Cruiser output', e);
        process.exit(1);
    }

    // 2. ESLint (Cyclomatic Complexity)
    console.log('   - Running ESLint for Complexity...');
    // We use a high max-warnings to prevent exit code 1 from crashing execSync immediate (though handled in try-catch)
    const eslintJson = runCommand(`npx eslint '${SRC_DIR}/**/*.{ts,tsx}' --format json --rule 'complexity: ["warn", 0]' --parser @typescript-eslint/parser`);

    const complexityMap = {}; // filePath -> maxComplexity
    try {
        const data = JSON.parse(eslintJson);
        data.forEach(file => {
            let maxC = 0;
            file.messages.forEach(msg => {
                if (msg.ruleId === 'complexity') {
                    // Message format: "Function 'X' has a complexity of N. Maximum allowed is 0."
                    const match = msg.message.match(/complexity of (\d+)/);
                    if (match) {
                        const c = parseInt(match[1], 10);
                        if (c > maxC) maxC = c;
                    }
                }
            });
            // Normalize path
            const relPath = path.relative(process.cwd(), file.filePath);
            complexityMap[relPath] = maxC;
        });
    } catch (e) {
        console.error('Failed to parse ESLint output');
    }

    // 3. Aggregate Data
    console.log('   - Aggregating Metrics...');
    const fileMetrics = modules
        .filter(m => m.source.startsWith(SRC_DIR) && !m.source.includes('.test.') && !m.source.includes('.d.ts'))
        .map(m => {
            const loc = getLoc(m.source);
            const fanOut = m.dependencies.length;
            const fanIn = m.dependents.length;
            // Instability = FanOut / (FanIn + FanOut).
            // DepCruiser might not calculate it in JSON output by default in older versions,
            // but usually does. If not, calculate it.
            let instability = 0;
            if (fanIn + fanOut > 0) {
                instability = fanOut / (fanIn + fanOut);
            }

            const maxComplexity = complexityMap[m.source] || 1; // Default to 1 if not found

            // Compound Complexity Score
            // Formula: (LOC / 10) + (Complexity * 2) + (FanOut * 2) + (Instability * 20)
            const score = (loc / 10) + (maxComplexity * 2) + (fanOut * 2) + (instability * 20);

            return {
                file: m.source,
                loc,
                fanOut,
                fanIn,
                instability: parseFloat(instability.toFixed(2)),
                complexity: maxComplexity,
                score: parseFloat(score.toFixed(1))
            };
        });

    // 4. Calculate Repo Health Score
    let healthScore = 100;
    let penalties = [];

    fileMetrics.forEach(f => {
        if (f.loc > THRESHOLDS.LOC) {
            healthScore -= 1.0;
        }
        if (f.complexity > THRESHOLDS.COMPLEXITY) {
            healthScore -= 1.0;
        }
        if (f.fanOut > THRESHOLDS.FAN_OUT) {
            healthScore -= 1.0;
        }
    });

    healthScore = Math.max(0, Math.min(100, healthScore)).toFixed(1);

    // 5. Generate Report
    const sortedByScore = [...fileMetrics].sort((a, b) => b.score - a.score).slice(0, 10);
    const sortedByComplexity = [...fileMetrics].sort((a, b) => b.complexity - a.complexity).slice(0, 10);

    const report = `
## 🚨 Automated Complexity Report

**Last Updated:** ${new Date().toISOString().split('T')[0]}

### 🏥 Repository Health Score: **${healthScore} / 100**

*   **Formula**: 100 - Penalties for Files exceeding thresholds (LOC > ${THRESHOLDS.LOC}, Complexity > ${THRESHOLDS.COMPLEXITY}, Fan-Out > ${THRESHOLDS.FAN_OUT}).
*   **Total Files Scanned**: ${fileMetrics.length}

### 🔥 Top 10 High-Complexity Files (Compound Score)
_Score = (LOC/10) + (Complexity*2) + (FanOut*2) + (Instability*20)_

| File | Score | LOC | Complexity | Fan-Out | Instability |
| :--- | :--- | :--- | :--- | :--- | :--- |
${sortedByScore.map(f => `| \`${f.file}\` | **${f.score}** | ${f.loc} | ${f.complexity} | ${f.fanOut} | ${f.instability} |`).join('\n')}

### 🧠 Top 10 Logic-Heavy Files (Cyclomatic Complexity)
| File | Max Complexity | LOC |
| :--- | :--- | :--- |
${sortedByComplexity.map(f => `| \`${f.file}\` | **${f.complexity}** | ${f.loc} |`).join('\n')}
`;

    // 6. Update File
    console.log('   - Updating docs/COMPLEXITY.md...');
    let currentContent = fs.readFileSync(DOCS_FILE, 'utf8');

    const MARKER_START = '## 🚨 Automated Complexity Report';
    const MARKER_END = '<!-- END AUTOMATED REPORT -->'; // Not used, we'll just append or replace end of file

    // Determine where to insert. If marker exists, replace everything after it.
    // If not, append to end.

    if (currentContent.includes(MARKER_START)) {
        const parts = currentContent.split(MARKER_START);
        currentContent = parts[0];
    }

    const newContent = currentContent.trim() + '\n\n' + report;
    fs.writeFileSync(DOCS_FILE, newContent);

    console.log('✅ Complexity Report Updated!');
}

main();
