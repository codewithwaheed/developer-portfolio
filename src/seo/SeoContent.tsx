import type { PortfolioContent } from '@/content/types';
import { siteConfig } from '@/config/site';

type Content = Pick<PortfolioContent, 'about' | 'jobs' | 'projects' | 'posts'>;

const h2 = 'mt-10 text-xl font-semibold text-[var(--fg)]';
const link = 'text-[var(--accent)] underline underline-offset-2';

export function SeoSections({ content }: { content: Content }) {
  const jobs = [...content.jobs].sort((a, b) => b.order - a.order);
  const featured = content.projects.filter((p) => p.featured);
  return (
    <>
      <section aria-labelledby="seo-about">
        <h2 id="seo-about" className={h2}>
          About
        </h2>
        <div
          className="mt-3 space-y-3 leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
          dangerouslySetInnerHTML={{ __html: content.about.html }}
        />
      </section>

      <section aria-labelledby="seo-experience">
        <h2 id="seo-experience" className={h2}>
          Experience
        </h2>
        <ul className="mt-3 space-y-6">
          {jobs.map((job) => (
            <li key={job.slug}>
              <h3 className="font-medium text-[var(--fg)]">
                {job.title} ·{' '}
                <a href={job.url} className={link}>
                  {job.company}
                </a>
              </h3>
              <p className="text-sm text-[var(--fg-faint)]">
                {job.range} · {job.location}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--fg-muted)]">
                {job.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="seo-projects">
        <h2 id="seo-projects" className={h2}>
          Featured projects
        </h2>
        <ul className="mt-3 space-y-5">
          {featured.map((p) => (
            <li key={p.id}>
              <h3 className="font-medium text-[var(--fg)]">{p.title}</h3>
              <div
                className="text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
                dangerouslySetInnerHTML={{ __html: p.description }}
              />
              <p className="mt-1 flex gap-4 text-sm">
                {p.github && (
                  <a href={p.github} className={link}>
                    Source
                  </a>
                )}
                {p.external && (
                  <a href={p.external} className={link}>
                    {p.cta ?? 'Visit'}
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {content.posts.length > 0 && (
        <section aria-labelledby="seo-posts">
          <h2 id="seo-posts" className={h2}>
            Pensieve
          </h2>
          <ul className="mt-3 space-y-2">
            {content.posts.map((post) => (
              <li key={post.slug}>
                <a href={`/pensieve/${post.slug}`} className={link}>
                  {post.title}
                </a>
                <span className="ml-2 text-sm text-[var(--fg-faint)]">{post.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="seo-contact">
        <h2 id="seo-contact" className={h2}>
          Contact
        </h2>
        <ul className="mt-3 space-y-1 text-[var(--fg-muted)]">
          <li>
            <a href={`mailto:${siteConfig.email}`} className={link}>
              {siteConfig.email}
            </a>
          </li>
          {siteConfig.socials.map((s) => (
            <li key={s.name}>
              <a href={s.url} className={link}>
                {s.name}
              </a>
            </li>
          ))}
          <li>
            <a href={siteConfig.bookingUrl} className={link}>
              Book a free consultation
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}

export function SeoContent({ content }: { content: Content }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-[var(--fg)]">
      <h1 className="text-3xl font-semibold">{siteConfig.name}</h1>
      <p className="mt-1 text-[var(--fg-muted)]">{siteConfig.title}</p>
      <SeoSections content={content} />
    </main>
  );
}
