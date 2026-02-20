import { test, expect } from '@playwright/test';

test('App elements are visible', async ({ page }) => {
  await page.goto('/?disableAnimations=true');

  await test.step('Verify Header elements', async () => {
    const viewport = page.viewportSize();
    // Tailwind sm is 640px. The title is hidden on smaller screens.
    const isMobile = viewport && viewport.width < 640;

    if (isMobile) {
      await expect(page.getByTestId('app-title')).toBeHidden();
    } else {
      await expect(page.getByTestId('app-title')).toBeVisible();
      await expect(page.getByTestId('app-title')).toHaveText('Dependency Graph');
    }
    await expect(page.getByTestId('app-version')).toBeVisible();
  });

  await test.step('Verify Zoom controls', async () => {
    await expect(page.getByRole('button', { name: 'zoom in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'zoom out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'fit view' })).toBeVisible();
  });

  await test.step('Verify GraphOverlay controls', async () => {
    await expect(page.getByTestId('refactor-graph-btn')).toBeVisible();

    // Select a node to make the isolate module toggle visible
    // We use main.tsx as it is known to be visible in the viewport across devices (verified in node_visibility.spec.ts)
    const node = page.getByTestId('node-main.tsx');

    // Fit view to ensure the node is in the viewport, especially on mobile
    await page.getByRole('button', { name: 'fit view' }).click();

    await expect(node).toBeVisible();
    await node.click();

    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
  });
});
