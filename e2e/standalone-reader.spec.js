import { test, expect } from '@playwright/test';
import { seedLocalStorage, mockLLMApis } from './helpers/appHelpers.js';

test.describe('Standalone Reader Generation', () => {
  test('generates a standalone reader with mocked API', async ({ page }) => {
    await seedLocalStorage(page);
    await mockLLMApis(page);

    await page.goto('/');
    await page.waitForSelector('.app-sidebar');

    // Look for the topic input form
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="day"], textarea').first();
    if (!await topicInput.isVisible()) {
      // May need to click a button to show the form first
      const newBtn = page.locator('button:has-text("New"), button:has-text("Generate"), button:has-text("+")').first();
      if (await newBtn.isVisible()) await newBtn.click();
      await page.waitForSelector('.settings-overlay');
    }

    if (await topicInput.isVisible()) {
      await topicInput.fill('Street food in Beijing');

      // Click the generate button
      const generateBtn = page.locator('button:has-text("Generate")').first();
      if (await generateBtn.isVisible() && await generateBtn.isEnabled()) {
        await generateBtn.click();
        // Wait for reader to appear (mocked response should be fast)
        await expect(page.locator('body')).toContainText('街头小吃', { timeout: 15000 });
      }
    }
  });
});
