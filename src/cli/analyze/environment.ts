import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
import { ValidationError } from './models';

const LEGACY_CONFIG_FILES = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.mjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml'
];

const FLAT_CONFIG_FILES = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    'eslint.config.ts',
    'eslint.config.mts',
    'eslint.config.cts'
];

export function validateNodeVersion(nodeVersionStr: string = process.versions.node): void {
    const cleanVersion = nodeVersionStr.replace(/^v/, '');
    const parts = cleanVersion.split('.').map(p => parseInt(p, 10));
    const major = parts[0] || 0;
    const minor = parts[1] || 0;

    // Baseline requirement: Node >= 20.19.0
    if (major < 20 || (major === 20 && minor < 19)) {
        throw new ValidationError(
            `Maritime requires Node.js >=20.19.0 (current version: v${cleanVersion}).`
        );
    }
}

export function detectEslintConfig(cwd: string = process.cwd()): {
    mode: string;
    isLegacy: boolean;
    hasFlatConfig: boolean;
    legacyFile?: string;
} {
    for (const legacyFile of LEGACY_CONFIG_FILES) {
        const fullPath = path.join(cwd, legacyFile);
        if (fs.existsSync(fullPath)) {
            return { mode: 'Legacy', isLegacy: true, hasFlatConfig: false, legacyFile };
        }
    }

    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const content = fs.readFileSync(pkgPath, 'utf8');
            const parsed = JSON.parse(content) as Record<string, unknown>;
            if (parsed && typeof parsed === 'object' && 'eslintConfig' in parsed && parsed.eslintConfig !== undefined) {
                return { mode: 'Legacy', isLegacy: true, hasFlatConfig: false, legacyFile: 'package.json (eslintConfig)' };
            }
        } catch {
            // Ignore package.json parse errors here; handled elsewhere if malformed
        }
    }

    for (const flatFile of FLAT_CONFIG_FILES) {
        const fullPath = path.join(cwd, flatFile);
        if (fs.existsSync(fullPath)) {
            return { mode: `Flat Config (${flatFile})`, isLegacy: false, hasFlatConfig: true };
        }
    }

    return { mode: 'None Detected', isLegacy: false, hasFlatConfig: false };
}

export function validateEslintEnvironment(
    cwd: string = process.cwd(),
    nodeVersionStr?: string
): { mode: string } {
    validateNodeVersion(nodeVersionStr);

    const absCwd = path.resolve(cwd);
    const req = createRequire(path.join(absCwd, 'package.json'));
    let eslintModule: { ESLint?: { version?: string } };
    try {
        const eslintPath = req.resolve('eslint');
        eslintModule = req(eslintPath) as { ESLint?: { version?: string } };
    } catch {
        throw new ValidationError(
            `ESLint is not installed in ${absCwd}. Maritime requires ESLint 9+ as a peer dependency.`
        );
    }

    const eslintVersion = eslintModule.ESLint?.version;
    if (eslintVersion) {
        const major = parseInt(eslintVersion.split('.')[0], 10);
        if (isNaN(major) || major < 9) {
            throw new ValidationError(
                `Unsupported ESLint version (v${eslintVersion}). Maritime requires ESLint >=9.0.0.`
            );
        }
    }

    const detected = detectEslintConfig(cwd);
    if (detected.isLegacy) {
        throw new ValidationError(
            `Legacy ESLint configuration detected (${detected.legacyFile}). Maritime requires ESLint 9+ flat configuration (eslint.config.*).`
        );
    }

    if (!detected.hasFlatConfig) {
        throw new ValidationError(
            `No ESLint flat configuration found in ${cwd}. Maritime requires ESLint 9+ flat configuration (eslint.config.*).`
        );
    }

    return { mode: detected.mode };
}
