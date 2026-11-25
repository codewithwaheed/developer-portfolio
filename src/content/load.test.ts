// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getContent, getPost } from './load';

describe('getContent', () => {
  it('orders jobs newest first', async () => {
    const c = await getContent();
    expect(c.jobs.map((j) => j.company)).toEqual(['10Pearls', 'Renesis Tech', 'WebWrite']);
    expect(c.jobs[0].bullets.length).toBeGreaterThan(0);
  });

  it('merges featured projects with their archive twins', async () => {
    const c = await getContent();
    expect(c.projects.filter((p) => p.featured)).toHaveLength(4);
    const ids = c.projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const fin = c.projects.find((p) => p.id === 'financethat');
    expect(fin?.cover).toBe('/content/featured/FinanceThat/demo.png');
    expect(fin?.company).toBe('Renesis Tech');
  });

  it('tags projects', async () => {
    const c = await getContent();
    expect(c.projects.find((p) => p.id === 'itchatbotassitant')?.tags).toContain('ai');
  });

  it('excludes drafts and renders html', async () => {
    const c = await getContent();
    expect(c.posts.some((p) => p.slug === 'markdown-playground')).toBe(false);
    expect(c.posts.every((p) => p.html.length > 0)).toBe(true);
  });

  it('loads about copy and skills', async () => {
    const c = await getContent();
    expect(c.about.skills).toContain('TypeScript');
    expect(c.about.photo).toBe('/me.jpg');
    expect(c.about.html).toContain('<p>');
  });

  it('is memoised', async () => {
    expect(await getContent()).toBe(await getContent());
  });
});

describe('getPost', () => {
  it('finds a post by slug and returns null otherwise', async () => {
    expect((await getPost('dark-mode-toggle'))?.title).toBe('Dark Mode Toggle');
    expect(await getPost('nope')).toBeNull();
  });
});
