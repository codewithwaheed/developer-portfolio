'use client';

import { useState } from 'react';

export function SettingsApp({ skills }: { skills: string[] }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const isOn = (s: string) => on[s] ?? true;

  return (
    <div className="h-full overflow-auto p-5">
      <h1 className="text-lg font-semibold text-[var(--fg)]">Models and tools</h1>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">Capabilities available to this agent.</p>
      <ul className="mt-4 divide-y divide-[var(--hairline,rgba(128,128,128,0.18))]">
        {skills.map((s) => (
          <li key={s} className="flex items-center justify-between py-2.5">
            <span className="font-mono text-sm text-[var(--fg)]">{s}</span>
            <button
              type="button"
              role="switch"
              aria-checked={isOn(s)}
              aria-label={s}
              onClick={() => setOn((p) => ({ ...p, [s]: !isOn(s) }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                isOn(s) ? 'bg-[var(--accent)]' : 'bg-[var(--control)]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                  isOn(s) ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
