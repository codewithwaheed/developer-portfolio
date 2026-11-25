'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IconMoon, IconSun, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { siteConfig } from '@/config/site';
import { safeStorage } from '@/lib/safeStorage';
import { useOS } from '../store';
import { useTheme } from '../theme';
import { formatClock } from './clock';

const MUTED_KEY = 'agentos.muted';
const CLOCK_TICK_MS = 30_000;

type MenuItem =
  | { label: string; onSelect: () => void; disabled?: boolean }
  | { label: string; href: string }
  | { separator: true };

interface Props {
  agentStatus?: 'idle' | 'thinking';
  onRestart?: () => void;
}

export function MenuBar({ agentStatus = 'idle', onRestart = () => {} }: Props) {
  const { theme, toggle } = useTheme();
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMuted(safeStorage.get(MUTED_KEY, false));
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!openMenu && !aboutOpen) return;
    const close = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
        setAboutOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setAboutOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [openMenu, aboutOpen]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    safeStorage.set(MUTED_KEY, next);
  };

  const os = useOS.getState;
  const menus: { id: string; label: ReactNode; name: string; items: MenuItem[] }[] = [
    {
      id: 'os',
      name: 'AgentOS',
      label: (
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="text-[var(--accent)]">◆</span> AgentOS
        </span>
      ),
      items: [
        { label: 'About this OS', onSelect: () => setAboutOpen(true) },
        { label: 'Classic view', href: '/classic' },
        { separator: true },
        { label: 'Restart', onSelect: onRestart },
      ],
    },
    {
      id: 'file',
      name: 'File',
      label: 'File',
      items: [
        { label: 'Open me.md', onSelect: () => os().openApp('me') },
        { label: 'Open resume.pdf', onSelect: () => os().openApp('resume') },
        { separator: true },
        {
          label: 'Close window',
          onSelect: () => {
            const f = os().focused;
            if (f) os().closeApp(f);
          },
        },
      ],
    },
    {
      id: 'agents',
      name: 'Agents',
      label: 'Agents',
      items: [{ label: 'Open agent.log', onSelect: () => os().openApp('agentlog') }],
    },
    {
      id: 'memory',
      name: 'Memory',
      label: 'Memory',
      items: [{ label: 'Clear memory', onSelect: () => {}, disabled: true }],
    },
    {
      id: 'help',
      name: 'Help',
      label: 'Help',
      items: [
        { label: 'Contact Waheed', onSelect: () => os().openApp('messages') },
        { label: 'Classic view', href: '/classic' },
      ],
    },
  ];

  const clocks = [siteConfig.homeTimezone, ...siteConfig.clientTimezones];
  const available = siteConfig.availability === 'open';

  return (
    <div
      ref={barRef}
      className="glass fixed inset-x-0 top-0 z-[1100] flex h-7 items-center justify-between rounded-none border-x-0 border-t-0 px-2 text-[13px] select-none"
    >
      <nav aria-label="Menu bar" className="flex items-center">
        {menus.map((m) => (
          <div key={m.id} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === m.id}
              aria-label={m.name}
              onClick={() => setOpenMenu((o) => (o === m.id ? null : m.id))}
              onPointerEnter={() => openMenu && openMenu !== m.id && setOpenMenu(m.id)}
              className={`h-[22px] rounded-md px-2.5 transition-colors ${
                openMenu === m.id ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]'
              }`}
            >
              {m.label}
            </button>
            <AnimatePresence>
              {openMenu === m.id && (
                <motion.ul
                  role="menu"
                  aria-label={m.name}
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -2, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  className="glass glass-strong absolute top-[26px] left-0 min-w-52 origin-top-left rounded-xl p-1.5"
                >
                  {m.items.map((item, i) => (
                    <MenuRow key={i} item={item} onDone={() => setOpenMenu(null)} />
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-1 text-[12.5px] text-[var(--fg)]">
        <IconButton label={muted ? 'Unmute sounds' : 'Mute sounds'} onClick={toggleMute}>
          {muted ? <IconVolumeOff size={15} stroke={1.8} /> : <IconVolume size={15} stroke={1.8} />}
        </IconButton>
        <IconButton
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggle}
        >
          {theme === 'dark' ? (
            <IconSun size={15} stroke={1.8} />
          ) : (
            <IconMoon size={15} stroke={1.8} />
          )}
        </IconButton>

        <span className="mx-1.5 flex items-center gap-1.5" title="Availability">
          <span
            aria-hidden
            className="size-[7px] rounded-full"
            style={{
              background: available ? 'var(--ok)' : 'var(--fg-faint)',
              boxShadow: available ? '0 0 8px var(--ok)' : undefined,
            }}
          />
          {available ? 'open for work' : 'busy'}
        </span>

        <span className="mx-1.5 flex items-center gap-3 tabular-nums" aria-label="Clocks">
          {clocks.map((c, i) => (
            <span key={c.label} className={i === 0 ? '' : 'text-[var(--fg-muted)]'}>
              <span className="mr-1 text-[11px] font-medium tracking-wide text-[var(--fg-muted)]">
                {c.label}
              </span>
              <time suppressHydrationWarning>{now ? formatClock(c.tz, now) : '--:--'}</time>
            </span>
          ))}
        </span>

        <span
          className="ml-1 flex h-[20px] items-center gap-1.5 rounded-full bg-[var(--control)] px-2 text-[12px]"
          aria-live="polite"
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${agentStatus === 'thinking' ? 'motion-safe:animate-pulse' : ''}`}
            style={{ background: agentStatus === 'thinking' ? 'var(--think)' : 'var(--accent)' }}
          />
          agent {agentStatus}
        </span>
      </div>

      <AnimatePresence>
        {aboutOpen && (
          <motion.div
            role="dialog"
            aria-label="About this OS"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass glass-strong absolute top-9 left-2 w-72 rounded-2xl p-5"
          >
            <p className="text-[15px] font-semibold">
              <span className="text-[var(--accent)]">◆</span> AgentOS
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
              The portfolio of {siteConfig.name}, {siteConfig.title}, running as a small desktop
              with an agent that can drive it.
            </p>
            <button
              type="button"
              onClick={() => setAboutOpen(false)}
              className="mt-4 h-7 rounded-lg bg-[var(--control)] px-3 text-[12.5px] font-medium hover:bg-[var(--hover)]"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuRow({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  if ('separator' in item) {
    return <li role="separator" className="mx-2 my-1 h-px bg-[var(--fg-faint)] opacity-40" />;
  }
  const cls =
    'flex h-7 w-full items-center rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:bg-[var(--accent)] focus-visible:text-white focus-visible:outline-none aria-disabled:pointer-events-none aria-disabled:opacity-40';
  return (
    <li role="none">
      {'href' in item ? (
        <a role="menuitem" href={item.href} className={cls} onClick={onDone}>
          {item.label}
        </a>
      ) : (
        <button
          type="button"
          role="menuitem"
          aria-disabled={item.disabled || undefined}
          className={cls}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            onDone();
          }}
        >
          {item.label}
        </button>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-[22px] place-items-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
    >
      {children}
    </button>
  );
}
