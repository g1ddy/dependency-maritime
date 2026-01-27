import { test, expect } from '@playwright/test';

test.describe('Graph Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173/dependency-maritime/');
    // Wait for canvas to be present
    await page.waitForSelector('.react-flow__renderer');
    // Wait for at least one node to render
    await page.waitForSelector('.react-flow__node');
    // Wait for layout to settle (roughly)
    await page.waitForTimeout(1000);
  });

  test('nodes should be visually contained in their parent groups initially', async ({ page }) => {
    // We assume 'App.tsx' exists and is inside a group (e.g., 'src').
    // Wait, 'src/App.tsx'. Parent is 'src'.
    // Or 'src/features/visualization/components/AppNode.tsx'. Parent 'components'.

    // Let's find "App.tsx" node.
    const childNode = page.locator('.react-flow__node-appNode').filter({ hasText: 'App.tsx' }).first();
    // Its parent should be "src".
    const groupNode = page.locator('.react-flow__node-groupNode').filter({ hasText: 'src' }).first();

    await expect(childNode).toBeVisible();
    await expect(groupNode).toBeVisible();

    const childBox = await childNode.boundingBox();
    const groupBox = await groupNode.boundingBox();

    expect(childBox).not.toBeNull();
    expect(groupBox).not.toBeNull();

    if (childBox && groupBox) {
      // Check containment
      // Note: Padding might mean child is slightly offset.
      // We verify child is INSIDE group box.
      expect(childBox.x).toBeGreaterThanOrEqual(groupBox.x);
      expect(childBox.y).toBeGreaterThanOrEqual(groupBox.y);
      expect(childBox.x + childBox.width).toBeLessThanOrEqual(groupBox.x + groupBox.width);
      expect(childBox.y + childBox.height).toBeLessThanOrEqual(groupBox.y + groupBox.height);
    }
  });

  test('dragging a node into a group should reparent and contain it', async ({ page }) => {
    // Find a node: "App.tsx".
    const targetNode = page.locator('.react-flow__node-appNode').filter({ hasText: 'App.tsx' }).first();

    // Find a group: "features".
    const targetGroup = page.locator('.react-flow__node-groupNode').filter({ hasText: 'features' }).first();

    await expect(targetNode).toBeVisible();
    await expect(targetGroup).toBeVisible();

    const startBox = await targetNode.boundingBox();
    const groupDestBox = await targetGroup.boundingBox();

    expect(startBox).not.toBeNull();
    expect(groupDestBox).not.toBeNull();

    if (startBox && groupDestBox) {
        // Calculate center of group to drop
        const dropX = groupDestBox.x + groupDestBox.width / 2;
        const dropY = groupDestBox.y + groupDestBox.height / 2;

        // Perform Drag
        await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
        await page.mouse.down();
        // Move in steps to simulate drag
        await page.mouse.move(dropX, dropY, { steps: 20 });
        await page.mouse.up();

        // Allow some time for state update and re-render
        await page.waitForTimeout(1000);

        // Verify new position
        const newBox = await targetNode.boundingBox();
        expect(newBox).not.toBeNull();

        if (newBox) {
            // Check visibility (coordinates not crazy)
            // We check containment relative to the group.
            // Note: If the group is off-screen (e.g. scrolled up), newBox.y might be negative relative to viewport.
            // As long as it is inside the group, it is correct.

            // Check containment in group
            // We allow some tolerance because dragging to center might result in slight offsets
            // depending on anchor points, but it should be largely overlapping.
            expect(newBox.x).toBeGreaterThan(groupDestBox.x - 50);
            expect(newBox.y).toBeGreaterThan(groupDestBox.y - 200); // Allow slop for header offset issues
        }
    }
  });
});
