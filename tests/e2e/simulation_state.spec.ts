import { test, expect } from '@playwright/test';

test.describe('Simulation State', () => {
  const APP_TSX_TEST_ID = 'node-App.tsx';
  const FEATURES_GROUP_TEST_ID = 'node-features';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?disableAnimations=true');
    await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });
  });

  test('dragging a node into a new folder should update its fullPath in the simulation state', async ({ page }) => {
    const targetNode = page.getByTestId(APP_TSX_TEST_ID);
    const targetGroup = page.getByTestId(FEATURES_GROUP_TEST_ID);

    await expect(targetNode).toBeVisible();
    await expect(targetGroup).toBeVisible();

    // 1. Verify Initial State
    await targetNode.click();

    const overlayPath = page.locator('.absolute.inset-0').getByText('src/App.tsx');
    await expect(overlayPath).toBeVisible();

    // Close Inspector if open so it cannot obstruct the drag target.
    const closeInspectorBtn = page.getByRole('button', { name: 'Close Inspector' });
    if (await closeInspectorBtn.isVisible()) {
      await closeInspectorBtn.click();
      await expect(closeInspectorBtn).toBeHidden();
    }

    // 2. Perform Drag
    const startBox = await targetNode.boundingBox();
    const groupDestBox = await targetGroup.boundingBox();

    expect(startBox).not.toBeNull();
    expect(groupDestBox).not.toBeNull();

    if (startBox && groupDestBox) {
      const viewport = page.viewportSize();
      const rawDropX = groupDestBox.x + Math.min(50, groupDestBox.width / 2);
      const rawDropY = groupDestBox.y + Math.min(50, groupDestBox.height / 2);
      const dropX = viewport ? Math.min(Math.max(rawDropX, 1), viewport.width - 1) : rawDropX;
      const dropY = viewport ? Math.min(Math.max(rawDropY, 1), viewport.height - 1) : rawDropY;

      await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(dropX, dropY, { steps: 20 });
      await page.mouse.up();
    }

    // 3. Verify Updated State
    const overlayPathLocator = page.locator('.absolute.inset-0 h3 + p');
    await expect(overlayPathLocator).not.toHaveText('src/App.tsx', { timeout: 10000 });

    const text = await overlayPathLocator.textContent();
    expect(text).toContain('src/features/');
    expect(text).toContain('App.tsx');
  });
});
