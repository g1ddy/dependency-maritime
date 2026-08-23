import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validateNodeVersion, detectEslintConfig, validateEslintEnvironment } from './environment';
import { ValidationError } from './models';

describe('environment', () => {
    describe('validateNodeVersion', () => {
        it('should accept Node 20.19.0 and higher', () => {
            expect(() => validateNodeVersion('20.19.0')).not.toThrow();
            expect(() => validateNodeVersion('v20.19.0')).not.toThrow();
            expect(() => validateNodeVersion('20.20.0')).not.toThrow();
            expect(() => validateNodeVersion('22.0.0')).not.toThrow();
        });

        it('should reject Node versions below 20.19.0', () => {
            expect(() => validateNodeVersion('18.20.0')).toThrow(ValidationError);
            expect(() => validateNodeVersion('18.20.0')).toThrow(/requires Node.js >=20.19.0/);
            expect(() => validateNodeVersion('20.18.3')).toThrow(ValidationError);
        });
    });

    describe('detectEslintConfig', () => {
        const testDir = path.join(process.cwd(), 'temp-test-env');

        beforeEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testDir, { recursive: true });
        });

        afterEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        });

        it('should detect legacy .eslintrc.cjs', () => {
            fs.writeFileSync(path.join(testDir, '.eslintrc.cjs'), 'module.exports = {};');
            const result = detectEslintConfig(testDir);
            expect(result.isLegacy).toBe(true);
            expect(result.legacyFile).toBe('.eslintrc.cjs');
            expect(result.mode).toBe('Legacy');
        });

        it('should detect legacy eslintConfig in package.json', () => {
            fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ eslintConfig: { extends: ['eslint:recommended'] } }));
            const result = detectEslintConfig(testDir);
            expect(result.isLegacy).toBe(true);
            expect(result.legacyFile).toBe('package.json (eslintConfig)');
        });

        it('should detect flat config eslint.config.js', () => {
            fs.writeFileSync(path.join(testDir, 'eslint.config.js'), 'export default [];');
            const result = detectEslintConfig(testDir);
            expect(result.isLegacy).toBe(false);
            expect(result.mode).toBe('Flat Config (eslint.config.js)');
        });

        it('should fallback to none detected if no config file present', () => {
            const result = detectEslintConfig(testDir);
            expect(result.isLegacy).toBe(false);
            expect(result.hasFlatConfig).toBe(false);
            expect(result.mode).toBe('None Detected');
        });
    });

    describe('validateEslintEnvironment', () => {
        const testDir = path.join(process.cwd(), 'temp-test-env-val');

        beforeEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
            fs.mkdirSync(testDir, { recursive: true });
        });

        afterEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        });

        it('should throw ValidationError on legacy config', () => {
            fs.writeFileSync(path.join(testDir, '.eslintrc.json'), '{}');
            expect(() => validateEslintEnvironment(testDir, '22.0.0')).toThrow(ValidationError);
            expect(() => validateEslintEnvironment(testDir, '22.0.0')).toThrow(/Legacy ESLint configuration detected \(\.eslintrc\.json\)/);
        });

        it('should throw ValidationError if no flat config is found', () => {
            expect(() => validateEslintEnvironment(testDir, '20.19.0')).toThrow(ValidationError);
            expect(() => validateEslintEnvironment(testDir, '20.19.0')).toThrow(/No ESLint flat configuration found/);
        });

        it('should succeed on valid environment and flat config', () => {
            fs.writeFileSync(path.join(testDir, 'eslint.config.mjs'), 'export default [];');
            const result = validateEslintEnvironment(testDir, '20.19.0');
            expect(result.mode).toBe('Flat Config (eslint.config.mjs)');
        });

        it('should throw ValidationError if ESLint package is missing in target directory', () => {
            const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maritime-test-no-eslint-'));
            try {
                fs.writeFileSync(path.join(isolatedDir, 'eslint.config.js'), 'export default [];');
                fs.writeFileSync(path.join(isolatedDir, 'package.json'), JSON.stringify({ name: 'dummy' }));

                expect(() => validateEslintEnvironment(isolatedDir, '20.19.0')).toThrow(ValidationError);
                expect(() => validateEslintEnvironment(isolatedDir, '20.19.0')).toThrow(/ESLint is not installed/);
            } finally {
                if (fs.existsSync(isolatedDir)) {
                    fs.rmSync(isolatedDir, { recursive: true, force: true });
                }
            }
        });

        it('should throw ValidationError if ESLint version is unsupported (<9.0.0)', () => {
            fs.writeFileSync(path.join(testDir, 'eslint.config.js'), 'export default [];');
            fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ name: 'dummy' }));

            const eslintMockDir = path.join(testDir, 'node_modules', 'eslint');
            fs.mkdirSync(eslintMockDir, { recursive: true });
            fs.writeFileSync(
                path.join(eslintMockDir, 'package.json'),
                JSON.stringify({ name: 'eslint', version: '8.57.0', main: 'index.js' })
            );
            fs.writeFileSync(
                path.join(eslintMockDir, 'index.js'),
                'module.exports = { ESLint: class { static version = "8.57.0"; } };'
            );

            expect(() => validateEslintEnvironment(testDir, '20.19.0')).toThrow(ValidationError);
            expect(() => validateEslintEnvironment(testDir, '20.19.0')).toThrow(/Unsupported ESLint version \(v8.57.0\)/);
        });
    });
});
