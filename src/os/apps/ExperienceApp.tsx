'use client';

import { useState } from 'react';
import type { Job } from '@/content/types';
import { formatUptime, isCurrent } from '@/content/uptime';

const processName = (j: Job) =>
  `${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.${j.title.split(/\s+/)[0].toLowerCase()}`;

export function ExperienceApp({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const now = new Date();

  return (
    <div className="h-full overflow-auto p-4 font-mono text-[13px]">
      <div className="grid grid-cols-[1fr_5rem_6rem] gap-3 px-3 pb-2 text-[11px] uppercase tracking-wider text-[var(--fg-faint)]">
        <span>process</span>
        <span>uptime</span>
        <span>status</span>
      </div>
      <ul className="flex flex-col gap-1">
        {jobs.map((j) => {
          const running = isCurrent(j.range);
          const expanded = open === j.slug;
          return (
            <li key={j.slug}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : j.slug)}
                className="grid w-full grid-cols-[1fr_5rem_6rem] items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--hover)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[var(--fg)]">{processName(j)}</span>
                  <span className="block truncate font-sans text-xs text-[var(--fg-muted)]">
                    {j.title} · {j.company}
                  </span>
                </span>
                <span className="text-[var(--fg-muted)]">{formatUptime(j.range, now)}</span>
                <span className={running ? 'text-[var(--ok)]' : 'text-[var(--fg-faint)]'}>
                  {running ? 'running' : 'exited 0'}
                </span>
              </button>
              {expanded && (
                <ol className="mx-3 mb-2 mt-1 flex flex-col gap-1.5 border-l border-[var(--glass-edge)] pl-4 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                  <li className="text-[var(--fg-faint)]">
                    {j.range} · {j.location}
                  </li>
                  {j.bullets.map((b, i) => (
                    <li key={i}>
                      <span className="mr-2 text-[var(--accent)]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {b}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
