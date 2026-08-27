import { test, expect } from '@playwright/test';

test.describe('Simulation State', () => {
  test.setTimeout(120_000);
  const APP_TSX_TEST_ID = 'node-App.tsx';
  const FEATURES_GROUP_TEST_ID = 'node-features';

  test.beforeEach(async ({ page }) => {
    // Navigate to the app with animations disabled
    await page.goto('http://localhost:5173/dependency-maritime/?disableAnimations=true');
    // Nodes render once before the asynchronous layout has positioned them. Waiting for
    // an arbitrary node here races that layout (particularly in WebKit).
    await expect(page.locator('[data-layout-ready="true"]')).toBeVisible({ timeout: 75_000 });
  });

  test('dragging a node into a new folder should update its fullPath in the simulation state', async ({ page }) => {
    const targetNode = page.getByTestId(APP_TSX_TEST_ID);
    const targetGroup = page.getByTestId(FEATURES_GROUP_TEST_ID);

    await expect(targetNode).toBeVisible();
    await expect(targetGroup).toBeVisible();

    // 1. Verify Initial State
    // Click to select the node
    // The readiness marker makes the state deterministic; force avoids WebKit's lingering
    // transform-stability heuristic on React Flow nodes.
    await targetNode.click({ force: true });

    // Check Overlay for initial path
    const overlayPath = page.locator('.absolute.inset-0').getByText('src/App.tsx');
    await expect(overlayPath).toBeVisible();

    // Close Inspector if open to prevent obstruction later
    // Check if it's the toggle button in the top bar.
    // To close the panel, we might need to click the "Close" button inside the panel if it exists, or toggle the top button.
    // The error showed "Close Inspector" button exists.
    const closeInspectorBtn = page.getByRole('button', { name: 'Close Inspector' });
    if (await closeInspectorBtn.isVisible()) {
      await closeInspectorBtn.click({ force: true });
      await expect(closeInspectorBtn).toBeHidden();
    }

    // 2. Perform Drag
    const startBox = await targetNode.boundingBox();
    const groupDestBox = await targetGroup.boundingBox();

    expect(startBox).not.toBeNull();
    expect(groupDestBox).not.toBeNull();

    if (startBox && groupDestBox) {
        // Calculate a safe drop position that is inside the group AND inside the viewport
        const viewportSize = page.viewportSize();
        if (!viewportSize) throw new Error('No viewport size');

        const safeX = Math.max(0, groupDestBox.x) + 50;
        const safeY = Math.max(0, groupDestBox.y) + 50;

        const dropX = Math.min(safeX, groupDestBox.x + groupDestBox.width - 20);
        const dropY = Math.min(safeY, groupDestBox.y + groupDestBox.height - 20);

        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();
        // Move in steps to simulate drag
        await page.mouse.move(dropX, dropY, { steps: 20 });
        await page.mouse.up();
    }

    // 3. Verify Updated State
    // Ensure node is still selected or re-select it
    // If the drag worked, the node moved.
    // If we can't click it easily, we can assume it's still selected if we didn't click elsewhere.

    // Check Overlay for NEW path
    // We accept any path starting with src/features because drag might drop into a subfolder
    const overlayPathLocator = page.locator('.absolute.inset-0 h3 + p');

    // Wait for update
    await expect(overlayPathLocator).not.toHaveText('src/App.tsx', { timeout: 10000 });

    const text = await overlayPathLocator.textContent();

    expect(text).toContain('src/features/');
    expect(text).toContain('App.tsx');
  });
});
