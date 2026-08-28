import { test, expect } from '@playwright/test';
import { assertUniqueScreenshotFilenames, screenshotPath } from './screenshot-assets.mjs';

test.describe('Documentation Screenshots', () => {
  test.beforeAll(() => {
    assertUniqueScreenshotFilenames();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/?disableAnimations=true');
    await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });
    await expect(page.getByTestId('node-main.tsx')).toBeVisible();
  });

  test('dashboard view', async ({ page }) => {
    await expect(page.getByTestId('node-main.tsx')).toBeVisible();
    await expect(page.getByText('Node Inspector', { exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Select Data Source' })).toBeHidden();

    await page.screenshot({ path: screenshotPath('dashboard'), fullPage: true });
  });

  test('node inspector view', async ({ page }) => {
    const mainNode = page.getByTestId('node-main.tsx');
    await mainNode.click();

    await expect(page.getByText('Node Inspector', { exact: true })).toBeVisible();
    await expect(page.locator('h4', { hasText: 'Metrics' })).toBeVisible();
    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Select Data Source' })).toBeHidden();

    await page.screenshot({ path: screenshotPath('inspector'), fullPage: true });
  });

  test('data source dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload/Select Data Source' }).click();

    const dialogTitle = page.getByRole('heading', { name: 'Select Data Source' });
    await expect(dialogTitle).toBeVisible();
    await expect(page.getByText('Sample Data', { exact: true })).toBeVisible();
    await expect(page.getByText('Project Graph', { exact: true })).toBeVisible();
    await expect(page.getByText('Click to upload or drag and drop', { exact: true })).toBeVisible();
    await expect(page.getByText('Node Inspector', { exact: true })).toBeHidden();

    await page.screenshot({ path: screenshotPath('upload'), fullPage: true });
  });
});
