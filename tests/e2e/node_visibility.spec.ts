import { test, expect } from '@playwright/test';

type Point = { x: number; y: number };

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

  const findHitTarget = async (): Promise<Point | null> => node.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const samples = [
      [0.5, 0.5],
      [0.25, 0.5],
      [0.75, 0.5],
      [0.5, 0.25],
      [0.5, 0.75],
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ];

    for (const [xRatio, yRatio] of samples) {
      const point = {
        x: bounds.left + bounds.width * xRatio,
        y: bounds.top + bounds.height * yRatio,
      };
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit === element || (hit instanceof Node && element.contains(hit))) {
        return point;
      }
    }

    return null;
  });

  // WebKit can briefly report a different center hit target while React Flow
  // applies its final transformed layout. Require the node to expose at least
  // one real pointer target instead of assuming its exact center must be free.
  let hitTarget = await findHitTarget();
  const hitTargetDeadline = Date.now() + 10_000;
  while (!hitTarget && Date.now() < hitTargetDeadline) {
    await page.waitForTimeout(250);
    hitTarget = await findHitTarget();
  }
  expect(hitTarget).not.toBeNull();

  // React Flow continuously transforms the node's ancestors in WebKit, so
  // locator.click() can wait forever for Playwright's stability check. Clicking
  // the verified hit-test point still sends a real browser pointer event.
  await page.mouse.click(hitTarget!.x, hitTarget!.y);
  await expect(page.getByTestId('isolate-module-toggle')).toBeVisible();
});
