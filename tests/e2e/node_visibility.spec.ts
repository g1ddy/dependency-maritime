import { test, expect } from '@playwright/test';

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  await page.goto('/?disableAnimations=true');

  // Wait for the graph to load and render nodes.
  // We look for a specific file node that we know exists in the sample data (e.g., main.tsx).
  const node = page.getByTestId('node-main.tsx');

  // Fit view to ensure the node is in the viewport, especially on mobile
  // React Flow's control can keep moving while the mobile viewport settles.
  await page.getByRole('button', { name: 'fit view' }).click({ force: true });

  // 1. Verify it is visible in the viewport/DOM
  await expect(node).toBeVisible();

  // 2. Exercise the node and verify the click reached its handler. A trial click
  // waits for pixel stability, which React Flow cannot guarantee while WebKit
  // is settling a mobile viewport.
  await node.click({ force: true });
  await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
});
