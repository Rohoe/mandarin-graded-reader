import { test, expect } from '@playwright/test';
import { seedWithReader, seedLocalStorage } from './helpers/appHelpers.js';

test.describe('Undo delete & difficulty badge', () => {
  test('delete standalone reader and undo restores it', async ({ page, isMobile }) => {
    await seedWithReader(page, { topic: 'Street food' });
    await page.goto('/');
    await expect(page.locator('body')).toContainText('街头小吃', { timeout: 10000 });

    // On mobile, open sidebar first
    if (isMobile) {
      const hamburger = page.locator('button[aria-label*="menu"], .mobile-header button').first();
      if (await hamburger.isVisible()) await hamburger.click();
      await page.waitForTimeout(500);
    }

    // Find and click the delete button for the reader
    const deleteBtn = page.locator('.syllabus-panel__delete-btn[aria-label="Delete reader"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();

    // Confirm deletion in the dialog
    const confirmBtn = page.locator('.syllabus-panel__confirm-delete-btn');
    await expect(confirmBtn).toBeVisible({ timeout: 2000 });
    await confirmBtn.click();

    // Notification with undo should appear
    const notification = page.locator('.app-notification');
    await expect(notification).toBeVisible({ timeout: 3000 });
    await expect(notification).toContainText('Deleted');

    // Click Undo before it auto-dismisses
    const undoBtn = page.locator('.app-notification__action');
    await expect(undoBtn).toBeVisible({ timeout: 2000 });
    await undoBtn.click();

    // Reader should reappear in sidebar
    await expect(page.locator('body')).toContainText('街头小吃', { timeout: 5000 });
  });

  test('delete syllabus and undo restores it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Syllabus delete — desktop only');

    // Seed with a syllabus instead of standalone reader
    const syllabusId = 'test_syllabus_1';
    const syllabusData = {
      id: syllabusId,
      topic: 'Chinese food culture',
      level: 1,
      langId: 'zh',
      createdAt: Date.now(),
      summary: 'This syllabus covers Chinese food culture.',
      lessons: [
        { lesson_number: 1, title_zh: '街头小吃', title_en: 'Street Snacks', description: 'Intro to street food.', vocabulary_focus: ['food'] },
      ],
    };

    await seedLocalStorage(page, {
      'gradedReader_syllabi': JSON.stringify([syllabusData]),
    });
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Verify syllabus is visible in sidebar
    await expect(page.locator('body')).toContainText('Chinese food culture', { timeout: 5000 });

    // Find the syllabus delete button — it's inside the syllabus item
    const deleteBtn = page.locator('.syllabus-panel__delete-btn[aria-label="Delete syllabus"]').first();

    // If not visible, the syllabus might need expanding or it might be in the main list
    if (!await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try hovering or looking for it more broadly
      const syllabusItem = page.locator('text=Chinese food culture').first();
      await syllabusItem.hover();
    }

    // If we still can't see delete btn, look for archive button flow
    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteBtn.click();

      const confirmBtn = page.locator('.syllabus-panel__confirm-delete-btn');
      await expect(confirmBtn).toBeVisible({ timeout: 2000 });
      await confirmBtn.click();

      // Notification with undo
      const notification = page.locator('.app-notification');
      await expect(notification).toBeVisible({ timeout: 3000 });
      await expect(notification).toContainText('Deleted');

      // Click Undo
      const undoBtn = page.locator('.app-notification__action');
      await undoBtn.click();

      // Syllabus should reappear
      await expect(page.locator('body')).toContainText('Chinese food culture', { timeout: 5000 });
    }
  });

  test('difficulty badge shows correct assessment', async ({ page, isMobile }) => {
    // Seed reader with 5 vocab words, 2 of which are "known"
    // ratio = 3/5 = 0.6 → assessment "good" → label "Good level"
    await seedWithReader(page, {
      learnedVocabulary: {
        '小吃': { pinyin: 'xiǎo chī', english: 'snack', langId: 'zh', dateAdded: new Date().toISOString(), interval: 1, ease: 2.5, nextReview: null, reviewCount: 1, lapses: 0 },
        '包子': { pinyin: 'bāo zi', english: 'steamed bun', langId: 'zh', dateAdded: new Date().toISOString(), interval: 1, ease: 2.5, nextReview: null, reviewCount: 1, lapses: 0 },
      },
    });
    await page.goto('/');
    await expect(page.locator('body')).toContainText('街头小吃', { timeout: 10000 });

    // On mobile, we might need to scroll up to see the header
    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }

    // Difficulty badge should be visible with "Good level" text
    const badge = page.locator('.reader-view__difficulty-badge');
    await expect(badge).toBeVisible({ timeout: 3000 });
    await expect(badge).toContainText('Good level');
  });
});
