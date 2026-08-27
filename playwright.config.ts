import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173/dependency-maritime/';

export default defineConfig({
  testDir: './tests/e2e',
  // Documentation screenshots have their own single-project configuration and
  // write to shared output paths. Keep them out of the browser-compatibility
  // suite so `test:e2e` does not regenerate each image three times.
  testIgnore: 'generate-screenshots.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
