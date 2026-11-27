'use client';

import type { Project, ProjectTag } from '@/content/types';
import { IconChevronLeft } from '@tabler/icons-react';
import { useOS } from '../store';
import { useIsMobile } from '../mobile/useIsMobile';
import { filterProjects } from './projectsFilter';

const TAGS: ProjectTag[] = ['ai', 'blockchain', 'fintech', 'web'];

function Row({ p, selected, roomy = false }: { p: Project; selected: boolean; roomy?: boolean }) {
  const openProject = useOS((s) => s.openProject);
  return (
    <button
      type="button"
      data-project-id={p.id}
      aria-current={selected || undefined}
      onClick={() => openProject(p.id)}
      className={`w-full rounded-md text-left text-sm ${
        roomy ? 'rounded-xl px-3.5 py-3' : 'truncate px-2.5 py-1.5'
      } ${
        selected
          ? 'bg-[var(--accent-soft)] text-[var(--fg)]'
          : 'text-[var(--fg-muted)] hover:bg-[var(--hover)]'
      }`}
    >
      {roomy ? (
        <>
          <span className="block truncate text-[15px] font-medium text-[var(--fg)]">{p.title}</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--fg-faint)]">
            {[p.company, p.tech.slice(0, 3).join(' · ')].filter(Boolean).join(' — ')}
          </span>
        </>
      ) : (
        p.title
      )}
    </button>
  );
}

function Detail({ p }: { p: Project }) {
  const links = [
    p.github && { label: 'GitHub', href: p.github },
    p.external && { label: 'Live', href: p.external },
    p.cta && { label: 'Article', href: p.cta },
  ].filter(Boolean) as { label: string; href: string }[];
  return (
    <article className="p-5">
      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover} alt={p.title} className="mb-4 w-full rounded-xl object-cover" />
      )}
      <h2 className="text-lg font-semibold text-[var(--fg)]">{p.title}</h2>
      {p.company && <p className="text-xs text-[var(--fg-faint)]">{p.company}</p>}
      <div
        className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)]"
        dangerouslySetInnerHTML={{ __html: p.description }}
      />
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {p.tech.map((t) => (
          <li
            key={t}
            className="rounded-full bg-[var(--control)] px-2.5 py-1 font-mono text-xs text-[var(--fg-muted)]"
          >
            {t}
          </li>
        ))}
      </ul>
      {links.length > 0 && (
        <div className="mt-4 flex gap-4 text-sm">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

export function ProjectsApp({ projects }: { projects: Project[] }) {
  const isMobile = useIsMobile();
  const filter = useOS((s) => s.projectFilter);
  const setProjectFilter = useOS((s) => s.setProjectFilter);
  const openId = useOS((s) => s.openProjectId);

  const companies = [...new Set(projects.map((p) => p.company).filter(Boolean))] as string[];
  const shown = filterProjects(projects, filter);
  const featured = shown.filter((p) => p.featured);
  const archive = shown.filter((p) => !p.featured);
  // Desktop opens with the first project shown, so the detail pane is never empty.
  const selected =
    projects.find((p) => p.id === openId) ?? (isMobile ? undefined : (featured[0] ?? archive[0]));
  const closeProject = useOS((s) => s.closeProject);

  // Phone: one pane at a time. The list fills the screen; a project opens full size
  // with a Back button that returns to the list.
  if (isMobile && selected) {
    return (
      <div className="flex h-full flex-col">
        <button
          type="button"
          onClick={closeProject}
          className="flex h-11 shrink-0 items-center gap-0.5 self-start px-3 text-[15px] font-medium text-[var(--accent)]"
        >
          <IconChevronLeft aria-hidden size={20} stroke={2.2} />
          All projects
        </button>
        <div className="min-h-0 flex-1 overflow-auto">
          <Detail p={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div
        className={`flex shrink-0 flex-col gap-3 overflow-auto p-3 ${
          isMobile ? 'w-full' : 'w-56 border-r border-[var(--glass-edge)]'
        }`}
      >
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => {
            const on = filter.tag === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setProjectFilter({ ...filter, tag: on ? undefined : t })}
                className={`rounded-full px-2.5 py-1 text-xs ${isMobile ? 'px-3.5 py-1.5 text-[13px]' : ''} ${
                  on
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--control)] text-[var(--fg-muted)] hover:bg-[var(--hover)]'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <select
          aria-label="Company"
          value={filter.company ?? ''}
          onChange={(e) => setProjectFilter({ ...filter, company: e.target.value || undefined })}
          className="rounded-md bg-[var(--control)] px-2 py-1.5 text-xs text-[var(--fg)]"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-0.5">
          {featured.map((p) => (
            <Row key={p.id} p={p} roomy={isMobile} selected={p.id === selected?.id} />
          ))}
        </div>
        {archive.length > 0 && (
          <div>
            <p className="px-2.5 pb-1 font-mono text-[11px] text-[var(--fg-faint)]">archive/</p>
            <div className="flex flex-col gap-0.5">
              {archive.map((p) => (
                <Row key={p.id} p={p} roomy={isMobile} selected={p.id === selected?.id} />
              ))}
            </div>
          </div>
        )}
        {shown.length === 0 && <p className="text-xs text-[var(--fg-faint)]">No matches.</p>}
      </div>
      {!isMobile && (
        <div className="min-w-0 flex-1 overflow-auto">
          {selected ? (
            <Detail p={selected} />
          ) : (
            <p className="p-5 text-sm text-[var(--fg-faint)]">Select a project.</p>
          )}
        </div>
      )}
    </div>
  );
}
