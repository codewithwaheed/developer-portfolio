import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('home is readable server-rendered HTML', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Waheed Ahmed' })).toBeVisible();
    await expect(page.getByText('10Pearls').first()).toBeVisible();
  });

  test('classic page links to booking', async ({ page }) => {
    await page.goto('/classic');
    await expect(page.getByRole('link', { name: /book/i }).first()).toBeVisible();
  });

  test('blog post renders as an article', async ({ page }) => {
    await page.goto('/pensieve/dark-mode-toggle');
    await expect(page.getByRole('heading', { name: 'Dark Mode Toggle' }).first()).toBeVisible();
  });
});

test('classic page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('/classic');
  const scrollable = await page.evaluate(
    () => document.scrollingElement!.scrollHeight > window.innerHeight,
  );
  expect(scrollable).toBe(true);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('post route hands off to the OS when JS runs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pensieve/dark-mode-toggle');
  await page.waitForURL(/\?app=pensieve&post=dark-mode-toggle/);
  await expect(page.getByRole('dialog').first()).toBeVisible();
});

test('/pensieve/[slug] is not swallowed by the pensieve redirects', async ({ request }) => {
  const res = await request.get('/pensieve/dark-mode-toggle', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});

test('sitemap and robots', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain('/classic');
  expect(xml).toContain('/pensieve/dark-mode-toggle');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('sitemap.xml');
});

test('home has canonical and og metadata', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Waheed Ahmed · Staff Software Engineer');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain('og.png');
});
