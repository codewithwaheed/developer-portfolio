import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContent, getPost } from '@/content/load';
import { PostRedirect } from '@/seo/PostRedirect';

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const { posts } = await getContent();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/pensieve/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/pensieve/${post.slug}`,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[var(--fg)]">
      <PostRedirect slug={post.slug} />
      <p className="text-sm">
        <Link href="/" className="text-[var(--accent)] underline underline-offset-2">
          Open AgentOS
        </Link>
      </p>
      <article className="mt-4">
        <h1 className="text-3xl font-semibold">{post.title}</h1>
        <p className="mt-1 text-sm text-[var(--fg-faint)]">{post.date}</p>
        <div
          className="pensieve-body mt-6 space-y-3 leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
    </main>
  );
}
