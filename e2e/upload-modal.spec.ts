import { test, expect } from '@playwright/test';

test('verify upload modal functionality', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Click the upload button
  // The button has aria-label="Upload/Select Data Source"
  const uploadBtn = page.getByLabel("Upload/Select Data Source");
  await expect(uploadBtn).toBeVisible();
  await uploadBtn.click();

  // Verify modal is open
  const modalTitle = page.getByRole("heading", { name: "Select Data Source" });
  await expect(modalTitle).toBeVisible();

  // Check for options
  await expect(page.getByText("Sample Data")).toBeVisible();
  await expect(page.getByText("Project Graph")).toBeVisible();
  await expect(page.getByText("Click to upload or drag and drop")).toBeVisible();

  // Click 'Project Graph'
  const projectGraphBtn = page.getByText("Project Graph");
  await projectGraphBtn.click();

  // Modal should close
  await expect(modalTitle).not.toBeVisible();

  // Ensure graph is visible (check for a known node from the project graph if possible,
  // or just that the graph container exists and isn't empty)
  // For now, we just ensure no crash.
  const graphContainer = page.locator('.react-flow');
  await expect(graphContainer).toBeVisible();
});
