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

    // Select a node to make the isolate module toggle visible
    // We use Port.tsx as it is known to be visible in the viewport across devices (verified in node_visibility.spec.ts)
    const node = page.locator('.react-flow__node-appNode:has-text("Port.tsx")');
    await expect(node).toBeVisible();
    await node.scrollIntoViewIfNeeded();
    await node.click();

    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
  });

  await test.step('Verify Zoom controls', async () => {
    await expect(page.getByRole('button', { name: 'zoom in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'zoom out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'fit view' })).toBeVisible();
  });
});
