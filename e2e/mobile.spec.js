import { test, expect } from '@playwright/test';

// Only run on mobile project
test.describe('Mobile Layout', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Mobile tests only on chromium');

  test('sidebar is hidden by default on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Only run on mobile viewport');

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Sidebar should not be visible initially
    const sidebar = page.locator('.app-sidebar, .syllabus-panel, [class*="sidebar"]').first();
    // On mobile, sidebar either has display:none or is off-screen
    const isVisible = await sidebar.isVisible().catch(() => false);
    // It should either be hidden or off-screen (not in viewport)
    if (isVisible) {
      const box = await sidebar.boundingBox();
      // If visible, it should be off-screen (negative x or beyond viewport)
      if (box) {
        const viewportSize = page.viewportSize();
        const isOffscreen = box.x + box.width <= 0 || box.x >= viewportSize.width;
        expect(isOffscreen || !isVisible).toBeTruthy();
      }
    }
  });

  test('hamburger button toggles sidebar on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Only run on mobile viewport');

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Find hamburger menu button
    const hamburger = page.locator('button[class*="hamburger"], button[aria-label*="menu"], .mobile-header button').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);

      // After clicking, sidebar should be visible
      const sidebar = page.locator('.app-sidebar--open, .syllabus-panel').first();
      await expect(sidebar).toBeVisible({ timeout: 2000 });
    }
  });

  test('responsive layout adapts to mobile viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Only run on mobile viewport');

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Page should render without horizontal scroll
    const body = page.locator('body');
    const viewportSize = page.viewportSize();
    const bodyBox = await body.boundingBox();
    if (bodyBox && viewportSize) {
      expect(bodyBox.width).toBeLessThanOrEqual(viewportSize.width + 1);
    }
  });
});
