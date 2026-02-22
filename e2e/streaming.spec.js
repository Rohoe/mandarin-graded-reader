import { test, expect } from '@playwright/test';
import { seedWithReader, mockLLMStreamingApi } from './helpers/appHelpers.js';

test.describe('Streaming responses', () => {
  test.skip(({ isMobile }) => isMobile, 'Streaming test — desktop only');

  test('Anthropic streaming renders reader on regenerate', async ({ page }) => {
    // Seed an existing reader so we can regenerate it
    await seedWithReader(page);
    const captured = await mockLLMStreamingApi(page);
    await page.goto('/');

    // Wait for reader to load
    await expect(page.locator('body')).toContainText('小吃', { timeout: 10000 });

    // Step 1: Click "Regenerate reader" to show confirmation
    const regenTrigger = page.locator('button:has-text("Regenerate reader")');
    await regenTrigger.scrollIntoViewIfNeeded();
    await regenTrigger.click();

    // Step 2: Click "Regenerate" confirm button
    const regenConfirm = page.locator('.reader-view__regen-confirm-btn');
    await expect(regenConfirm).toBeVisible({ timeout: 2000 });
    await regenConfirm.click();

    // Wait for at least one request to be captured
    await expect(async () => {
      expect(captured.requests.length).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // Verify request had stream: true
    expect(captured.requests[0].stream).toBe(true);

    // Wait for the "Reader ready" notification indicating completion
    await expect(page.locator('.app-notification')).toContainText('Reader ready', { timeout: 15000 });
  });
});
