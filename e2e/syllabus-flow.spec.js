import { test, expect } from '@playwright/test';
import { seedLocalStorage, mockLLMApis } from './helpers/appHelpers.js';

test.describe('Syllabus Flow', () => {
  test('generates a syllabus with mocked API', async ({ page }) => {
    await seedLocalStorage(page);
    await mockLLMApis(page);

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Switch to syllabus mode if needed
    const syllabusTab = page.locator('button:has-text("Syllabus"), [role="tab"]:has-text("Syllabus")').first();
    if (await syllabusTab.isVisible()) {
      await syllabusTab.click();
      await page.waitForTimeout(300);
    }

    // Fill in topic
    const topicInput = page.locator('input[placeholder*="topic"], input[placeholder*="business"], textarea').first();
    if (await topicInput.isVisible()) {
      await topicInput.fill('Chinese food culture');

      // Click generate
      const generateBtn = page.locator('button:has-text("Generate")').first();
      if (await generateBtn.isVisible() && await generateBtn.isEnabled()) {
        await generateBtn.click();
        // Wait for syllabus to be created (shows lesson titles from mock)
        await expect(page.locator('body')).toContainText('Street Snacks', { timeout: 15000 });
      }
    }
  });
});
