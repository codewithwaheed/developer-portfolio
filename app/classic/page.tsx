import Link from 'next/link';
import type { Metadata } from 'next';
import { getContent } from '@/content/load';
import { siteConfig } from '@/config/site';
import { SeoSections } from '@/seo/SeoContent';

export const metadata: Metadata = {
  title: `${siteConfig.name} · Classic view`,
  alternates: { canonical: '/classic' },
  openGraph: { title: `${siteConfig.name} · Classic view`, url: '/classic' },
};

export default async function Classic() {
  const content = await getContent();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[var(--fg)]">
      <p className="text-sm">
        <Link href="/" className="text-[var(--accent)] underline underline-offset-2">
          Open AgentOS
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold">{siteConfig.name}</h1>
      <p className="mt-1 text-[var(--fg-muted)]">{siteConfig.title}</p>
      <SeoSections content={content} />
    </main>
  );
}
