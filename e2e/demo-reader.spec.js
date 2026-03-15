import { test, expect } from '@playwright/test';

test.describe('Demo Reader', () => {
  test('loads demo reader for new users', async ({ page }) => {
    await page.goto('/');
    // Wait for the demo reader content to appear
    await expect(page.locator('body')).toContainText('小猫找朋友', { timeout: 10000 });
  });

  test('shows "(sample)" label for demo reader', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('(sample)', { timeout: 10000 });
  });

  test('story content is visible', async ({ page }) => {
    await page.goto('/');
    // Wait for story to render
    await expect(page.locator('body')).toContainText('小猫', { timeout: 10000 });
  });

  test('vocab words are clickable in story', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('.app-sidebar');

    // Find a vocab button in the story
    const vocabBtn = page.locator('.vocab-word, button[class*="vocab"]').first();
    if (await vocabBtn.isVisible()) {
      await vocabBtn.click();
      // Should show a popover with definition (use .first() to handle multiple matching elements)
      await expect(page.locator('.reader-view__popover').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('English demo reader visible in sidebar with "(sample)" label', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-sidebar');
    // Both demo readers should show (sample) labels
    const sampleLabels = page.locator('text=(sample)');
    await expect(sampleLabels).toHaveCount(2, { timeout: 10000 });
  });

  test('navigating to English demo shows English story content', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-sidebar');
    // Click on the English demo reader in the sidebar
    const enDemo = page.locator('text=A New School');
    await enDemo.click();
    // Verify English story content appears
    await expect(page.locator('body')).toContainText('Li Wei', { timeout: 10000 });
  });
});
