import { test, expect } from '@playwright/test';

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('home is readable server-rendered HTML', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Waheed Ahmed' })).toBeVisible();
    await expect(page.getByText('10Pearls').first()).toBeVisible();
  });

  test('home scrolls and the OS overlay is gone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/');
    const display = await page.evaluate(
      () => getComputedStyle(document.querySelector('.agentos-root')!).display,
    );
    expect(display).toBe('none');
    expect(
      await page.evaluate(() => document.scrollingElement!.scrollHeight > window.innerHeight),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 99999));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Contact' })).toBeInViewport();
  });

  test('classic page links to booking', async ({ page }) => {
    await page.goto('/classic');
    await expect(page.getByRole('link', { name: /book/i }).first()).toBeVisible();
  });

  test('blog post renders as a readable, scrollable article', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/pensieve/dark-mode-toggle');
    await expect(page.getByRole('heading', { name: 'Dark Mode Toggle' }).first()).toBeVisible();
    const display = await page.evaluate(
      () => getComputedStyle(document.querySelector('.agentos-root')!).display,
    );
    expect(display).toBe('none');
    expect(
      await page.evaluate(() => document.scrollingElement!.scrollHeight > window.innerHeight),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 99999));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
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

test('post route opens the post inside the OS and keeps its URL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pensieve/dark-mode-toggle');
  const pensieve = page.locator('[role="dialog"]').filter({
    has: page.getByRole('heading', { name: 'Dark Mode Toggle' }),
  });
  await expect(pensieve.first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Lock screen' })).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(new URL(page.url()).pathname).toBe('/pensieve/dark-mode-toggle');
  expect(new URL(page.url()).search).toBe('');
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

for (const path of ['/', '/classic', '/pensieve/dark-mode-toggle']) {
  test(`${path} keeps og:image and og:site_name`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    expect(html).toMatch(/<meta property="og:image" content="[^"]*og\.png"/);
    expect(html).toContain('property="og:site_name"');
  });
}
