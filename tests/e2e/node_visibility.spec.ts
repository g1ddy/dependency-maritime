import { test, expect } from '@playwright/test';

type Point = { x: number; y: number };

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');
  await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });

  const fileNodes = page.locator('.react-flow__node-appNode');

  // Readiness is published after React Flow has completed its post-layout
  // fitView. Require an actual file node rather than a specific file: on a
  // narrow, pannable graph the chosen fixture node can legitimately finish
  // just beyond the viewport even though other file nodes are interactable.
  await expect(fileNodes.first()).toBeVisible();

  const findHitTarget = async (): Promise<Point | null> => fileNodes.evaluateAll((wrappers) => {
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

    for (const wrapper of wrappers) {
      const bounds = wrapper.getBoundingClientRect();
      // elementFromPoint only accepts viewport coordinates. Mobile WebKit's
      // fitView can leave nodes partially clipped, so sample their visible
      // rectangle rather than their complete transformed bounds.
      const left = Math.max(0, bounds.left);
      const top = Math.max(0, bounds.top);
      const right = Math.min(window.innerWidth, bounds.right);
      const bottom = Math.min(window.innerHeight, bounds.bottom);
      const width = right - left;
      const height = bottom - top;

      if (width <= 0 || height <= 0) continue;

      for (const [xRatio, yRatio] of samples) {
        const point = {
          x: left + width * xRatio,
          y: top + height * yRatio,
        };
        const hit = document.elementFromPoint(point.x, point.y);

        if (hit === wrapper || (hit instanceof Node && wrapper.contains(hit))) {
          return point;
        }
      }
    }

    return null;
  });

  // WebKit can briefly report a different hit target while React Flow applies
  // its final transformed layout. Require a real app-node pointer target.
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
