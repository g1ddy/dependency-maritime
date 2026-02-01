import { test, expect } from '@playwright/test';

test.describe('Simulation State', () => {
  const APP_TSX_TEST_ID = 'node-App.tsx';
  const FEATURES_GROUP_TEST_ID = 'node-features';

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/dependency-maritime/');
    // Wait for canvas to be present
    await page.waitForSelector('.react-flow__renderer');
    // Wait for at least one node to render
    await page.waitForSelector('.react-flow__node');

    // Fit view to ensure nodes are within viewport for consistent coordinates
    const fitViewBtn = page.getByRole('button', { name: 'fit view' });
    await expect(fitViewBtn).toBeVisible();
    await fitViewBtn.click();
    // Allow animation to settle
    await page.waitForTimeout(500);
  });

  test('dragging a node into a new folder should update its fullPath in the simulation state', async ({ page }) => {
    const targetNode = page.getByTestId(APP_TSX_TEST_ID);
    const targetGroup = page.getByTestId(FEATURES_GROUP_TEST_ID);

    await expect(targetNode).toBeVisible();
    await expect(targetGroup).toBeVisible();

    // 1. Verify Initial State
    // Click to select the node
    await targetNode.click();

    // Check Overlay for initial path
    const overlayPath = page.locator('.absolute.inset-0').getByText('src/App.tsx');
    await expect(overlayPath).toBeVisible();

    // Close Inspector if open to prevent obstruction later
    // Use exact match to avoid strict mode violations
    const inspectorBtn = page.getByRole('button', { name: 'Inspector', exact: true });
    // Check if it's the toggle button in the top bar.
    // To close the panel, we might need to click the "Close" button inside the panel if it exists, or toggle the top button.
    // The error showed "Close Inspector" button exists.
    const closeInspectorBtn = page.getByRole('button', { name: 'Close Inspector' });
    if (await closeInspectorBtn.isVisible()) {
        await closeInspectorBtn.click();
    } else {
        // If panel is open but close button not found (maybe inspector button toggles it)
        // Let's assume selecting the node opened it.
        // We can just click the canvas to deselect everything?
        // await page.locator('.react-flow__pane').click();
        // But that clears selection, so overlay disappears. We need selection for overlay.
    }

    // 2. Perform Drag
    const startBox = await targetNode.boundingBox();
    const groupDestBox = await targetGroup.boundingBox();

    expect(startBox).not.toBeNull();
    expect(groupDestBox).not.toBeNull();

    if (startBox && groupDestBox) {
        // Calculate a safe drop position that is inside the group
        const dropX = groupDestBox.x + 50;
        const dropY = groupDestBox.y + 50;

        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();
        // Move in steps to simulate drag
        await page.mouse.move(dropX, dropY, { steps: 20 });
        await page.mouse.up();

        // Wait for potential state updates/animations
        await page.waitForTimeout(1000);
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
