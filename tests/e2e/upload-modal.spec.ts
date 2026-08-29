import { test, expect } from '@playwright/test';

test('verify upload modal functionality', async ({ page }) => {
  test.setTimeout(120_000);

  // Navigate to the app
  await page.goto('/?disableAnimations=true');

  // The data-source dialog is independent of graph layout readiness.
  const uploadBtn = page.getByLabel('Upload/Select Data Source');
  await expect(uploadBtn).toBeVisible();
  await uploadBtn.click({ force: true });

  // Verify modal is open
  const modalTitle = page.getByRole('heading', { name: 'Select Data Source' });
  await expect(modalTitle).toBeVisible();

  // Check for options
  await expect(page.getByText('Sample Data')).toBeVisible();
  await expect(page.getByText('Project Graph')).toBeVisible();
  await expect(page.getByText('Click to upload or drag and drop')).toBeVisible();

  // Click 'Project Graph'
  const projectGraphBtn = page.getByRole('button', { name: 'Project Graph' });
  await expect(projectGraphBtn).toBeVisible();
  // WebKit can keep sampling the dialog as unstable while the graph behind it
  // updates. The visible button is inside the modal, so bypass that redundant
  // stability check without relying on a time-based wait.
  await projectGraphBtn.click({ force: true });

  // Modal should close
  await expect(modalTitle).not.toBeVisible();

  // Ensure graph is visible after changing the source.
  const graphContainer = page.locator('.react-flow');
  await expect(graphContainer).toBeVisible();
});
