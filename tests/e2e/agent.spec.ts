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

test('the lock screen is modal: Cmd+K and Tab stay off the desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Lock screen' })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+K');
  await expect(page.getByRole('textbox', { name: 'Ask AgentOS' })).not.toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const inShell = await page.evaluate(
      () => !!document.activeElement?.closest('nav[aria-label="Dock"], [data-agent-bar]'),
    );
    expect(inShell).toBe(false);
  }
});
