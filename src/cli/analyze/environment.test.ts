import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
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

        it('should fallback to default flat config if no config file present', () => {
            const result = detectEslintConfig(testDir);
            expect(result.isLegacy).toBe(false);
            expect(result.mode).toBe('Flat Config (default)');
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

        it('should succeed on valid environment and flat config', () => {
            fs.writeFileSync(path.join(testDir, 'eslint.config.mjs'), 'export default [];');
            const result = validateEslintEnvironment(testDir, '20.19.0');
            expect(result.mode).toBe('Flat Config (eslint.config.mjs)');
        });
    });
});
