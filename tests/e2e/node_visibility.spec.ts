import { test, expect } from '@playwright/test';

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');
  await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });

  const node = page.getByTestId('node-main.tsx');

  // Verify the node is visible and is the topmost element at its center. Using
  // Playwright's stability-based click here is unreliable in WebKit because
  // React Flow continuously updates the node's transformed ancestor.
  await expect(node).toBeVisible();
  await expect(node).toHaveJSProperty('isConnected', true);
  const receivesPointerEvents = await node.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2
    );

    return hit === element || element.contains(hit);
  });
  expect(receivesPointerEvents).toBe(true);

  await node.evaluate((element) => {
    element
      .closest('.react-flow__node')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
});
