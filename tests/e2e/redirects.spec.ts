import { test, expect } from '@playwright/test';

test('old archive url redirects into the OS', async ({ page }) => {
  await page.goto('/archive');
  expect(new URL(page.url()).search).toBe('?app=projects');
});

test('old service worker is replaced by a self-unregistering one', async ({ request }) => {
  const res = await request.get('/sw.js');
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain('unregister');
});
