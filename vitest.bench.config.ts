import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Extract base test config but override setup files for bench to exclude mock
// We do not use mergeConfig because it concatenates array values (like setupFiles).
export default defineConfig({
  ...viteConfig,
  test: {
    ...viteConfig.test,
    setupFiles: ["./tests/utils/setup.ts", "./tests/utils/setup-worker-mock.ts"],
    include: ['**/*.bench.ts'],
  }
});
