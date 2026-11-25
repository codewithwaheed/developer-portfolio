'use client';

import { useState } from 'react';
import { useOS } from '../store';
import { appMeta, type AppId } from '../apps/registry';
import { AppGlyph } from '../apps/icons';

const DESKTOP_APPS: AppId[] = ['me', 'resume'];

/** Files on the desktop: click selects, double-click or Enter opens. */
export function DesktopIcons() {
  const openApp = useOS((s) => s.openApp);
  const [selected, setSelected] = useState<AppId | null>(null);

  return (
    <ul
      aria-label="Desktop"
      className="absolute top-12 right-6 z-[5] flex flex-col items-center gap-3"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setSelected(null);
      }}
    >
      {DESKTOP_APPS.map((id) => {
        const isSelected = selected === id;
        return (
          <li key={id}>
            <button
              type="button"
              data-app-icon={id}
              aria-label={`Open ${appMeta[id].title}`}
              onClick={() => setSelected(id)}
              onFocus={() => setSelected(id)}
              onDoubleClick={() => openApp(id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  openApp(id);
                }
              }}
              className="group flex w-[92px] flex-col items-center gap-1.5 rounded-xl p-2 outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <AppGlyph
                id={id}
                className={`size-14 transition-transform duration-200 group-active:scale-95 ${
                  isSelected ? 'ring-2 ring-white/70 ring-offset-0' : ''
                }`}
              />
              <span
                className={`rounded-md px-1.5 py-0.5 text-[12px] font-medium leading-tight transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--fg)] [text-shadow:0_1px_8px_var(--wall-base)]'
                }`}
              >
                {appMeta[id].title}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
