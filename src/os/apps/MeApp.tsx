import type { About } from '@/content/types';
import { siteConfig } from '@/config/site';

export function MeApp({ about }: { about: About }) {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={about.photo}
          alt={siteConfig.name}
          className="size-20 rounded-2xl object-cover shadow-md"
        />
        <div>
          <h1 className="text-xl font-semibold text-[var(--fg)]">{siteConfig.name}</h1>
          <p className="text-sm text-[var(--fg-muted)]">{siteConfig.title}</p>
        </div>
      </div>
      <div
        className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
        dangerouslySetInnerHTML={{ __html: about.html }}
      />
      {about.skills.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {about.skills.map((s) => (
            <li
              key={s}
              className="rounded-full bg-[var(--control)] px-2.5 py-1 font-mono text-xs text-[var(--fg-muted)]"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {siteConfig.socials.map((s) => (
          <li key={s.name}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
