import { test, expect } from '@playwright/test';

test('App elements are visible', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?disableAnimations=true');
  await expect(page.locator('[data-interaction-ready="true"]')).toBeVisible({ timeout: 75_000 });

  await test.step('Verify Header elements', async () => {
    const viewport = page.viewportSize();
    // Tailwind sm is 640px. The title is hidden on smaller screens.
    const isMobile = viewport && viewport.width < 640;

    if (isMobile) {
      await expect(page.getByTestId('app-title')).toBeHidden();
    } else {
      await expect(page.getByTestId('app-title')).toBeVisible();
      await expect(page.getByTestId('app-title')).toHaveText('Dependency Graph');
    }
    await expect(page.getByTestId('app-version')).toBeVisible();
  });

  await test.step('Verify Zoom controls', async () => {
    await expect(page.getByRole('button', { name: 'zoom in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'zoom out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'fit view' })).toBeVisible();
  });

  await test.step('Verify GraphOverlay controls', async () => {
    await expect(page.getByTestId('refactor-graph-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspector' })).toBeVisible();
  });
});
