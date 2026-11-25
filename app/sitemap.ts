import type { MetadataRoute } from 'next';
import { getContent } from '@/content/load';
import { siteConfig } from '@/config/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts } = await getContent();
  return [
    { url: `${siteConfig.url}/` },
    { url: `${siteConfig.url}/classic` },
    ...posts.map((p) => ({
      url: `${siteConfig.url}/pensieve/${p.slug}`,
      lastModified: new Date(p.date),
    })),
  ];
}
