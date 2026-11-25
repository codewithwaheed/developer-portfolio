'use client';

import type { Post } from '@/content/types';
import { useOS } from '../store';

export function PensieveApp({ posts }: { posts: Post[] }) {
  const openPostSlug = useOS((s) => s.openPostSlug);
  const openPost = useOS((s) => s.openPost);
  const current = posts.find((p) => p.slug === openPostSlug) ?? posts[0];

  if (!current) {
    return <p className="p-6 text-sm text-[var(--fg-muted)]">No posts yet.</p>;
  }

  return (
    <div className="flex h-full">
      <ul className="w-52 shrink-0 space-y-1 overflow-auto border-r border-[var(--hairline,rgba(128,128,128,0.18))] p-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              onClick={() => openPost(p.slug)}
              aria-current={p.slug === current.slug ? 'true' : undefined}
              className={`w-full rounded-lg px-2.5 py-2 text-left hover:bg-[var(--hover)] ${
                p.slug === current.slug ? 'bg-[var(--control)]' : ''
              }`}
            >
              <span className="block text-sm font-medium text-[var(--fg)]">{p.title}</span>
              <span className="block font-mono text-[11px] text-[var(--fg-faint)]">{p.date}</span>
            </button>
          </li>
        ))}
      </ul>
      <article className="min-w-0 flex-1 overflow-auto p-6">
        <h1 className="text-xl font-semibold text-[var(--fg)]">{current.title}</h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{current.description}</p>
        <div
          className="pensieve-body mt-4 space-y-3 text-sm leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </article>
    </div>
  );
}
