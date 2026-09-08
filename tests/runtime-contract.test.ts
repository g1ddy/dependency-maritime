import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_NODE_ENGINES } from '../src/cli/analyze/environment';

type PackageContract = {
    engines: { node: string };
    devDependencies: { '@types/node': string };
};

describe('Node runtime contract synchronization', () => {
    const packageContract = JSON.parse(readFileSync('package.json', 'utf8')) as PackageContract;

    it('keeps runtime validation synchronized with package.json engines', () => {
        expect(SUPPORTED_NODE_ENGINES).toBe(packageContract.engines.node);
    });

    it('pins Node types to the oldest supported runtime family and minor baseline', () => {
        expect(packageContract.devDependencies['@types/node']).toBe('~22.13.0');
    });
});
