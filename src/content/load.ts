import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import type { About, Job, PortfolioContent, Post, Project, ProjectTag } from './types';

const contentDir = () => path.join(process.cwd(), 'content');

async function toHtml(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' } })
    .use(rehypeStringify)
    .process(md);
  return String(file);
}

async function readMd(file: string) {
  const { data, content } = matter(await fs.readFile(file, 'utf8'));
  return { data, content };
}

async function subdirs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const dateStr = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '');

async function loadAbout(): Promise<About> {
  const { data, content } = await readMd(path.join(contentDir(), 'about.md'));
  return { html: await toHtml(content), skills: data.skills ?? [], photo: '/me.jpg' };
}

async function loadJobs(): Promise<Job[]> {
  const dir = path.join(contentDir(), 'jobs');
  const jobs = await Promise.all(
    (await subdirs(dir)).map(async (slug): Promise<Job> => {
      const { data, content } = await readMd(path.join(dir, slug, 'index.md'));
      const bullets = content
        .split('\n')
        .map((l) => l.match(/^\s*[-*]\s+(.*)$/)?.[1].trim())
        .filter((b): b is string => Boolean(b));
      return {
        slug,
        title: data.title,
        ...(Array.isArray(data.roles) && data.roles.length > 1 ? { roles: data.roles } : {}),
        company: data.company,
        ...(typeof data.logo === 'string' ? { logo: data.logo } : {}),
        location: data.location,
        range: data.range,
        url: data.url,
        bullets,
        order: Number(data.date),
      };
    }),
  );
  return jobs.sort((a, b) => b.order - a.order);
}

async function loadProjects(): Promise<Project[]> {
  const root = contentDir();
  const archiveDir = path.join(root, 'projects');
  const featuredDir = path.join(root, 'featured');

  const archive = await Promise.all(
    (await fs.readdir(archiveDir))
      .filter((f) => f.endsWith('.md'))
      .map(async (f): Promise<Project> => {
        const { data, content } = await readMd(path.join(archiveDir, f));
        return {
          id: f.replace(/\.md$/, '').toLowerCase(),
          title: data.title,
          description: await toHtml(content),
          tech: data.tech ?? [],
          tags: (data.tags ?? []) as ProjectTag[],
          company: str(data.company),
          github: str(data.github),
          external: str(data.external),
          featured: false,
          date: dateStr(data.date),
        };
      }),
  );

  const byTitle = new Map(archive.map((p) => [p.title, p]));
  const featured = await Promise.all(
    (await subdirs(featuredDir)).map(async (folder): Promise<Project> => {
      const { data, content } = await readMd(path.join(featuredDir, folder, 'index.md'));
      const twin = byTitle.get(data.title);
      if (twin) byTitle.delete(data.title);
      return {
        id: folder.toLowerCase(),
        title: data.title,
        description: await toHtml(content),
        tech: data.tech ?? twin?.tech ?? [],
        tags: (data.tags ?? twin?.tags ?? []) as ProjectTag[],
        company: str(data.company) ?? twin?.company,
        github: str(data.github) ?? twin?.github,
        external: str(data.external) ?? twin?.external,
        cta: str(data.cta),
        cover: data.cover ? `/content/featured/${folder}/${path.basename(data.cover)}` : undefined,
        featured: true,
        date: twin?.date ?? dateStr(data.date),
      };
    }),
  );

  return [...featured, ...byTitle.values()].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || b.date.localeCompare(a.date),
  );
}

async function loadPosts(): Promise<Post[]> {
  const dir = path.join(contentDir(), 'posts');
  const posts = await Promise.all(
    (await subdirs(dir)).map(async (slug) => {
      const { data, content } = await readMd(path.join(dir, slug, 'index.md'));
      if (data.draft) return null;
      return {
        slug,
        title: data.title,
        description: data.description ?? '',
        date: dateStr(data.date),
        tags: data.tags ?? [],
        html: await toHtml(content),
      } satisfies Post;
    }),
  );
  return posts.filter((p): p is Post => p !== null).sort((a, b) => b.date.localeCompare(a.date));
}

let cache: Promise<PortfolioContent> | undefined;

export function getContent(): Promise<PortfolioContent> {
  cache ??= (async () => {
    const [about, jobs, projects, posts] = await Promise.all([
      loadAbout(),
      loadJobs(),
      loadProjects(),
      loadPosts(),
    ]);
    return { about, jobs, projects, posts };
  })();
  return cache;
}

export async function getPost(slug: string): Promise<Post | null> {
  return (await getContent()).posts.find((p) => p.slug === slug) ?? null;
}
