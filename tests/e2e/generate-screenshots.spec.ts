import { test, expect } from '@playwright/test';

test.describe('Documentation Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    // Wait for the graph to render (wait for at least one node)
    await page.waitForSelector('[data-testid^="node-"]', { timeout: 10000 });
    // Ensure we are fit to view
    await page.getByRole('button', { name: 'fit view' }).click();
    // Allow animations to settle
    await page.waitForTimeout(1000);
  });

  test('dashboard view', async ({ page }) => {
    // Capture the main dashboard
    await page.screenshot({ path: 'docs/images/screenshot-dashboard.png', fullPage: true });
  });

  test('node inspector view', async ({ page }) => {
    // Select a specific node to open the inspector
    // We try to find main.tsx or fallback to the first available node
    const mainNode = page.locator('[data-testid="node-main.tsx"]');
    if (await mainNode.count() > 0) {
        await mainNode.click({ force: true });
    } else {
        await page.locator('[data-testid^="node-"]').first().click({ force: true });
    }

    // Wait for inspector to appear by checking for the Panel Title
    // On mobile, the inspector might not open automatically, so we check and toggle if needed
    const inspectorTitle = page.getByText('Node Inspector');
    if (!await inspectorTitle.isVisible()) {
        await page.getByRole('button', { name: 'Inspector' }).click();
    }
    await expect(inspectorTitle).toBeVisible();

    // Then verify content is loaded
    await expect(page.locator('h4', { hasText: 'Metrics' })).toBeVisible();

    await page.screenshot({ path: 'docs/images/screenshot-inspector.png', fullPage: true });
  });

  test('data source dialog', async ({ page }) => {
    // Click the upload icon to open data sources
    await page.getByRole('button', { name: 'Upload/Select Data Source' }).click();

    // Wait for dialog
    await expect(page.getByText('Select Data Source')).toBeVisible();

    // Capture specifically the dialog area if possible, or the whole page with overlay
    // For docs, whole page with modal overlay is usually fine, or we can clip it.
    // Let's take the whole page to show context.
    await page.screenshot({ path: 'docs/images/screenshot-upload.png', fullPage: true });
  });
});
