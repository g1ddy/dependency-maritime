import { test, expect } from '@playwright/test';

test('File nodes are visible and interactable (not obscured by folders)', async ({ page }) => {
  await page.goto('/');

  // Wait for the graph to load and render nodes.
  // We look for a specific file node that we know exists in the sample data (e.g., Port.tsx).
  // The class .react-flow__node-appNode identifies file nodes.
  const nodeSelector = '.react-flow__node-appNode:has-text("Port.tsx")';
  const node = page.locator(nodeSelector);

  // 1. Verify it is visible in the viewport/DOM
  await expect(node).toBeVisible();

  // 2. Verify it is not obscured by other elements (like folder nodes)
  // The 'click' action with trial: true performs actionable checks without clicking.
  // This ensures the center of the element is visible to the user and not covered.
  await node.click({ trial: true });
});
