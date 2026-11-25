import { test, expect } from '@playwright/test';

test('agent bar opens the AI projects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByText('click to wake').click();
  await page.keyboard.press('ControlOrMeta+K');
  await page.keyboard.type('show me your AI work');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'projects/' })).toBeVisible();
  await expect(page.locator('[data-project-id="itchatbotassitant"]')).toBeVisible();
});
