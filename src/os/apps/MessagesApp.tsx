import { siteConfig } from '@/config/site';

export function MessagesApp() {
  return (
    <div className="h-full overflow-auto p-5">
      <h1 className="text-lg font-semibold text-[var(--fg)]">Say hello</h1>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">The fastest way to reach me is email.</p>
      <a
        href={`mailto:${siteConfig.email}`}
        className="mt-4 block rounded-2xl bg-[var(--control)] px-4 py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--hover)]"
      >
        {siteConfig.email}
      </a>
      <ul className="mt-4 space-y-2">
        {siteConfig.socials.map((s) => (
          <li key={s.name}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-[var(--control)] px-4 py-2.5 text-sm text-[var(--fg)] hover:bg-[var(--hover)]"
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
