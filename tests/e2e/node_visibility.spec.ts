import { test, expect } from '@playwright/test';

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');
  await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });

  const node = page.getByTestId('node-main.tsx');

  // Verify the node is visible and that Playwright can hit-test it normally.
  // This deliberately preserves the regression protection against folder/overlay obstruction.
  await expect(node).toBeVisible();
  await node.click({ trial: true });
  await node.click();
  await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
});
