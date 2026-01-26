import { test, expect } from '@playwright/test';

test('App elements are visible', async ({ page }) => {
  await page.goto('/');

  await test.step('Verify Header elements', async () => {
    await expect(page.getByTestId('app-title')).toBeVisible();
    await expect(page.getByTestId('app-version')).toBeVisible();
    await expect(page.getByTestId('app-title')).toHaveText('Dependency Graph');
  });

  await test.step('Verify GraphOverlay controls', async () => {
    await expect(page.getByTestId('refactor-graph-btn')).toBeVisible();
    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
  });

  await test.step('Verify Zoom controls', async () => {
    await expect(page.getByTestId('zoom-in-btn')).toBeVisible();
    await expect(page.getByTestId('zoom-out-btn')).toBeVisible();
    await expect(page.getByTestId('fit-view-btn')).toBeVisible();
  });
});
