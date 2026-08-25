import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Extract base test config but override setup files for bench to exclude mock
export default mergeConfig(viteConfig, defineConfig({
  test: {
    setupFiles: ["./tests/utils/setup.ts", "./tests/utils/setup-worker-mock.ts"],
    include: ['**/*.bench.ts'],
  }
}));
