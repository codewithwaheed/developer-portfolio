'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { IconChevronDown, IconTrendingUp } from '@tabler/icons-react';
import type { Job } from '@/content/types';
import { formatUptime, isCurrent } from '@/content/uptime';

const processName = (j: Job) =>
  `${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.${j.title.split(/\s+/)[0].toLowerCase()}`;

const TINTS: [string, string][] = [
  ['#8ea2ff', '#5b6cff'],
  ['#5eead4', '#0ea5a4'],
  ['#fcd34d', '#f59e0b'],
];

/** Make the numbers in a bullet ("35%", "10 million", "15,000+") stand out. */
function emphasize(text: string): ReactNode[] {
  return text.split(/(\d[\d,.]*\s?(?:%|\+|million|k\b|x\b)?\+?)/gi).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-[var(--fg)]">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function CareerPath({ roles }: { roles: NonNullable<Job['roles']> }) {
  return (
    <div className="mb-3 rounded-xl bg-[var(--accent-soft)] px-3.5 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[var(--accent)] uppercase">
        <IconTrendingUp aria-hidden size={14} stroke={2.2} />
        Promoted
      </p>
      <ol className="relative space-y-2.5 pl-5">
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-[var(--accent)] opacity-40"
        />
        {roles.map((r, i) => (
          <li key={r.title} className="relative">
            <span
              aria-hidden
              className={`absolute top-[5px] -left-5 size-[11px] rounded-full border-2 border-[var(--accent)] ${
                i === 0 ? 'bg-[var(--accent)]' : 'bg-[var(--surface)]'
              }`}
            />
            <span className="block text-[13.5px] font-semibold text-[var(--fg)]">{r.title}</span>
            <span className="block text-xs text-[var(--fg-muted)]">
              {i === 0 ? 'Current' : 'Earlier'}
              {r.range ? ` · ${r.range}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ExperienceApp({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const now = new Date();

  return (
    <div className="h-full overflow-auto p-4">
      <ul className="flex flex-col gap-3">
        {jobs.map((j, idx) => {
          const running = isCurrent(j.range);
          const expanded = open === j.slug;
          const [from, to] = TINTS[idx % TINTS.length];
          return (
            <li
              key={j.slug}
              className="overflow-hidden rounded-2xl border border-[var(--glass-edge)] bg-[var(--glass-bg-strong)] shadow-[0_1px_2px_rgba(30,24,80,0.06),0_6px_18px_-8px_rgba(30,24,80,0.18)]"
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : j.slug)}
                className="flex w-full items-center gap-3.5 p-3.5 text-left transition-colors hover:bg-[var(--hover)]"
              >
                {j.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={j.logo}
                    alt={`${j.company} logo`}
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-xl border border-[var(--glass-edge)] bg-white object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-[17px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    {j.company[0]}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[var(--fg)]">
                    {j.title}
                    {j.roles && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 align-middle text-[10.5px] font-semibold text-[var(--accent)]">
                        <IconTrendingUp aria-hidden size={11} stroke={2.4} />
                        promoted
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[13px] text-[var(--fg-muted)]">
                    {j.company} · {j.location}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--fg-faint)]">
                    {processName(j)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${
                      running
                        ? 'bg-[color-mix(in_srgb,var(--ok)_20%,transparent)] text-[var(--fg)]'
                        : 'bg-[var(--control)] text-[var(--fg-muted)]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{ background: running ? 'var(--ok)' : 'var(--fg-faint)' }}
                    />
                    {running ? 'running' : 'exited 0'}
                  </span>
                  <span className="font-mono text-[12px] text-[var(--fg-muted)]">
                    {formatUptime(j.range, now)}
                  </span>
                </span>
                <IconChevronDown
                  aria-hidden
                  size={18}
                  className={`shrink-0 text-[var(--fg-faint)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
              {expanded && (
                <div className="border-t border-[var(--glass-edge)] px-4 pt-3 pb-4">
                  {j.roles && <CareerPath roles={j.roles} />}
                  <p className="mb-2.5 text-xs font-medium text-[var(--fg-muted)]">
                    {j.range} · {j.location}
                  </p>
                  <ol className="flex flex-col gap-2.5">
                    {j.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                        <span className="mt-[3px] grid size-[18px] shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] font-mono text-[10.5px] font-semibold text-[var(--accent)]">
                          {i + 1}
                        </span>
                        <span className="text-[color-mix(in_srgb,var(--fg)_82%,transparent)]">
                          {emphasize(b)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
