'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconChevronLeft, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { siteConfig } from '@/config/site';
import { isMuted, play, setMuted, subscribeMuted } from '@/sound/sound';
import { useOS, type WindowState } from '../store';
import { APP_IDS, appMeta, type AppId } from '../apps/registry';
import { AppGlyph } from '../apps/icons';
import { formatClock } from '../shell/clock';
import { StatusDot, useAvailability } from '../shell/AvailabilityPill';
import { useNow } from '../shell/useNow';

const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const;
const COLUMNS = 4;
const CLOCK_TICK_MS = 30_000;

/** The files that sit on the desktop come first, then every dock app. */
const HOME_APPS: AppId[] = ['me', 'resume', ...APP_IDS.filter((id) => appMeta[id].inDock)];
const ROWS: AppId[][] = Array.from({ length: Math.ceil(HOME_APPS.length / COLUMNS) }, (_, i) =>
  HOME_APPS.slice(i * COLUMNS, (i + 1) * COLUMNS),
);

function topWindow(windows: WindowState[]): WindowState | null {
  let best: WindowState | null = null;
  for (const w of windows) if (!w.minimized && (!best || w.z > best.z)) best = w;
  return best;
}

function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Some browsers throw when vibration is blocked; a tap still works.
  }
}

interface Props {
  agentStatus: 'idle' | 'thinking';
  renderApp(id: AppId): ReactNode;
}

/** Phone layout: status bar, home-screen grid, one full-screen app at a time. */
export function MobileShell({ agentStatus, renderApp }: Props) {
  const windows = useOS((s) => s.windows);
  const top = topWindow(windows);
  const reduce = useReducedMotion() ?? false;

  // Single-app model: whatever opens an app (a tap, the agent, a link inside an app),
  // every other window closes, so Back always lands on the home screen.
  useEffect(() => {
    const keepOnlyTop = () => {
      const { windows: all, closeApp } = useOS.getState();
      if (all.length < 2) return;
      const keep = topWindow(all)?.id;
      all.forEach((w) => w.id !== keep && closeApp(w.id));
    };
    keepOnlyTop();
    return useOS.subscribe((s, prev) => {
      if (s.windows !== prev.windows) keepOnlyTop();
    });
  }, []);

  return (
    <>
      <StatusBar agentStatus={agentStatus} />
      <HomeScreen covered={top !== null} reduce={reduce} />
      <AnimatePresence>
        {top && (
          <AppView key={top.id} id={top.id} reduce={reduce}>
            {renderApp(top.id)}
          </AppView>
        )}
      </AnimatePresence>
    </>
  );
}

function StatusBar({ agentStatus }: { agentStatus: 'idle' | 'thinking' }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => true);
  const now = useNow(CLOCK_TICK_MS);
  const info = useAvailability(now);
  const busy = siteConfig.availability === 'busy';
  const thinking = agentStatus === 'thinking';

  return (
    <header
      aria-label="Status bar"
      className="glass fixed inset-x-0 top-0 z-[1100] flex h-11 items-center justify-between rounded-none border-x-0 border-t-0 px-4 pt-[env(safe-area-inset-top)] text-[13px] select-none"
    >
      <time suppressHydrationWarning className="text-[15px] font-semibold tabular-nums">
        {now ? formatClock(undefined, now) : '--:--'}
      </time>
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
          <StatusDot state={busy ? 'offline' : (info?.state ?? 'offline')} />
          {busy ? 'busy' : (info?.label ?? 'availability')}
        </span>
        <span
          aria-live="polite"
          className="flex h-[22px] items-center gap-1.5 rounded-full bg-[var(--control)] px-2 text-[12px]"
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${thinking ? 'motion-safe:animate-pulse' : ''}`}
            style={{ background: thinking ? 'var(--think)' : 'var(--accent)' }}
          />
          agent {agentStatus}
        </span>
        <button
          type="button"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          onClick={() => setMuted(!muted)}
          className="grid size-8 place-items-center rounded-full text-[var(--fg-muted)] active:bg-[var(--hover)]"
        >
          {muted ? <IconVolumeOff size={17} stroke={1.8} /> : <IconVolume size={17} stroke={1.8} />}
        </button>
      </div>
    </header>
  );
}

function HomeScreen({ covered, reduce }: { covered: boolean; reduce: boolean }) {
  const openApp = useOS((s) => s.openApp);
  const info = useAvailability(useNow());
  const busy = siteConfig.availability === 'busy';

  return (
    <motion.main
      aria-hidden={covered || undefined}
      inert={covered}
      initial={false}
      animate={covered ? { scale: 0.94, opacity: 0.35 } : { scale: 1, opacity: 1 }}
      transition={reduce ? { duration: 0 } : SPRING}
      className="absolute inset-0 overflow-y-auto px-5 pt-[68px] pb-[132px]"
    >
      <section className="glass glass-strong mb-7 rounded-[26px] p-5">
        <p className="text-[12px] font-medium tracking-wide text-[var(--accent)] uppercase">
          ◆ AgentOS
        </p>
        <h1 className="mt-1.5 text-[22px] leading-tight font-semibold tracking-[-0.01em]">
          {siteConfig.name}
        </h1>
        <p className="mt-0.5 text-[14px] text-[var(--fg-muted)]">{siteConfig.title}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[var(--fg-muted)]">
          <StatusDot state={busy ? 'offline' : (info?.state ?? 'offline')} />
          {busy ? 'Currently busy' : info ? `${info.label} · ${info.detail}` : 'Availability'}
        </p>
      </section>

      <div role="grid" aria-label="Home screen" className="flex flex-col gap-6">
        {ROWS.map((row, r) => (
          <div key={r} role="row" className="grid grid-cols-4 gap-x-3">
            {row.map((id) => (
              <div key={id} role="gridcell" className="flex justify-center">
                <motion.button
                  type="button"
                  data-app-icon={id}
                  aria-label={`Open ${appMeta[id].title}`}
                  whileTap={reduce ? undefined : { scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  onClick={() => {
                    haptic();
                    openApp(id);
                  }}
                  className="flex w-full max-w-[76px] flex-col items-center gap-1.5 rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <AppGlyph id={id} className="size-[60px] rounded-[22%]" />
                  <span className="w-full truncate text-center text-[11.5px] font-medium text-[var(--fg)] [text-shadow:0_1px_8px_var(--wall-base)]">
                    {appMeta[id].title}
                  </span>
                </motion.button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.main>
  );
}

function AppView({ id, reduce, children }: { id: AppId; reduce: boolean; children: ReactNode }) {
  const closeApp = useOS((s) => s.closeApp);
  const ref = useRef<HTMLDivElement>(null);
  const title = appMeta[id].title;

  useEffect(() => {
    play('open');
    // Move focus in, unless the visitor is typing to the agent (it opened this app).
    if (!document.activeElement?.closest('[data-agent-bar]')) {
      ref.current?.focus({ preventScroll: true });
    }
  }, []);

  const back = () => {
    haptic();
    play('close');
    closeApp(id);
  };

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      data-window={id}
      style={{ inset: 0 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          back();
        }
      }}
      initial={reduce ? false : { opacity: 0, y: 48, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 32, scale: 0.97 }
      }
      transition={reduce ? { duration: 0 } : SPRING}
      className="glass glass-strong fixed z-[900] flex flex-col rounded-none border-0 pt-11 outline-none"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 px-2">
        <button
          type="button"
          onClick={back}
          className="flex h-9 items-center gap-0.5 rounded-full pr-3 pl-1.5 text-[15px] font-medium text-[var(--accent)] active:bg-[var(--hover)]"
        >
          <IconChevronLeft aria-hidden size={20} stroke={2.2} />
          Back
        </button>
        <h2 className="flex flex-1 items-center justify-center gap-2 truncate pr-[76px] text-[15px] font-semibold tracking-[-0.005em]">
          <AppGlyph id={id} className="size-5" />
          {title}
        </h2>
      </div>
      <div className="mx-2 mb-[104px] min-h-0 flex-1 overflow-auto rounded-[18px] bg-[var(--surface)]">
        {children}
      </div>
    </motion.div>
  );
}
