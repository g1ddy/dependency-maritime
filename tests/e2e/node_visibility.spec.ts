import { test, expect } from '@playwright/test';

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');
  await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });

  const node = page.getByTestId('node-main.tsx');

  // Readiness is published after React Flow has completed its post-layout
  // fitView. Keep this as a real browser action so the test exercises pointer
  // targeting and React Flow's click handling, rather than only invoking the
  // React handler with a synthetic event.
  await expect(node).toBeVisible();
  await expect(node).toHaveJSProperty('isConnected', true);
  const hitTarget = await node.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const point = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    const hit = document.elementFromPoint(
      point.x,
      point.y
    );

    return { point, receivesPointerEvents: hit === element || element.contains(hit) };
  });
  expect(hitTarget.receivesPointerEvents).toBe(true);

  // React Flow continuously transforms the node's ancestors in WebKit, so
  // locator.click() can wait forever for Playwright's stability check. Clicking
  // the verified hit-test point still sends a real browser pointer event.
  await page.mouse.click(hitTarget.point.x, hitTarget.point.y);
  await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
});
