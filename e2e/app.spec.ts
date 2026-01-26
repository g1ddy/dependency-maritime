import { test, expect } from '@playwright/test';

test.describe('App Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display app title and version', async ({ page }) => {
    const title = page.getByTestId('app-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Dependency Graph');

    const version = page.getByTestId('app-version');
    await expect(version).toBeVisible();

    const versionText = await version.textContent();
    expect(versionText).toBeTruthy();
  });

  test('should display main controls', async ({ page }) => {
    await expect(page.getByTestId('refactor-graph-btn')).toBeVisible();
    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
    await expect(page.getByTestId('zoom-in-btn')).toBeVisible();
    await expect(page.getByTestId('zoom-out-btn')).toBeVisible();
    await expect(page.getByTestId('fit-view-btn')).toBeVisible();
  });
});
