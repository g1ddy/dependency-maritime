#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const evidencePaths = [
    '.maritime/dependency-graph.json',
    '.maritime/complexity-metrics.json',
    '.maritime/complexity-report.md',
    '.maritime/manifest.json',
    'docs/images/dependency-graph.svg'
];

for (const evidencePath of evidencePaths) {
    if (!existsSync(evidencePath)) {
        throw new Error(`Missing generated evidence: ${evidencePath}`);
    }
}

const manifestPath = '.maritime/manifest.json';
const candidateManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
let committedManifest;
let committedManifestText;

try {
    committedManifestText = execFileSync('git', ['show', `HEAD:${manifestPath}`], { encoding: 'utf8' });
    committedManifest = JSON.parse(committedManifestText);
} catch {
    // A new evidence bundle is necessarily substantive.
}

const otherChanges = execFileSync(
    'git',
    [
        'status', '--porcelain', '--',
        '.maritime/dependency-graph.json',
        '.maritime/complexity-metrics.json',
        '.maritime/complexity-report.md',
        'docs/images/dependency-graph.svg'
    ],
    { encoding: 'utf8' }
).trim().length > 0;

const withoutGenerationTime = manifest => {
    const normalized = structuredClone(manifest);
    delete normalized.generatedAt;
    return normalized;
};
const manifestChanged = !committedManifest || JSON.stringify(withoutGenerationTime(candidateManifest)) !==
    JSON.stringify(withoutGenerationTime(committedManifest));
const changed = otherChanges || manifestChanged;

if (!changed && committedManifestText !== undefined) {
    // Generation time is provenance for a changed bundle, not a reason by itself
    // to produce a new commit on every workflow run.
    writeFileSync(manifestPath, committedManifestText);
}

if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
}
console.log(changed ? 'Substantive generated evidence changes detected.' : 'Generated evidence is current.');
