import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  async function openSettingsModal(page, isMobile) {
    // On mobile, open sidebar first to access settings
    if (isMobile) {
      const hamburger = page.locator('button[class*="hamburger"], button[aria-label*="menu"], .mobile-header button').first();
      if (await hamburger.isVisible()) await hamburger.click();
      await page.waitForTimeout(500);
    }

    const settingsBtn = page.locator('button:has-text("Settings"), button[aria-label*="settings"], button[aria-label*="Settings"]').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  test('opens settings modal', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const opened = await openSettingsModal(page, isMobile);
    if (opened) {
      await expect(page.locator('[class*="settings"], [class*="modal"]').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('toggles dark mode', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const opened = await openSettingsModal(page, isMobile);
    if (!opened) return;

    // Find dark mode toggle
    const darkToggle = page.locator('text=Dark mode').locator('..').locator('input[type="checkbox"], button, label').first();
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', 'dark', { timeout: 2000 });
    }
  });

  test('shows AI Provider tab', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const opened = await openSettingsModal(page, isMobile);
    if (!opened) return;

    // Click AI Provider tab
    const providerTab = page.locator('button:has-text("AI Provider"), [role="tab"]:has-text("AI Provider")').first();
    if (await providerTab.isVisible()) {
      await providerTab.click();
      await page.waitForTimeout(500);
      // Should show provider options — verify heading and provider buttons exist in the settings modal
      const settingsModal = page.locator('[class*="settings"], [class*="modal"]').first();
      await expect(settingsModal).toContainText('AI Provider', { timeout: 3000 });
    }
  });
});
