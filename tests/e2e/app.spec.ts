import { test, expect } from '@playwright/test';

test('App elements are visible', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');

  // React Flow initially renders unpositioned nodes while layout runs in a worker. Do not
  // interact with that transient graph: WebKit can otherwise begin a click while it moves.
  await expect(page.locator('[data-layout-ready="true"]')).toBeVisible({ timeout: 75_000 });

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

    await expect(node).toBeVisible();
    // The graph is state-ready; bypass WebKit's transform-stability heuristic, which can
    // continue reporting React Flow nodes as moving after the zero-duration fit completes.
    await node.click({ force: true });

    await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
  });
});
