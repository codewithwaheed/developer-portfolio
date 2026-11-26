'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { siteConfig } from '@/config/site';
import { useOS } from '../store';
import { formatTime12, getAvailability, type Availability } from './availability';

const DOT: Record<Availability['state'], { color: string; glow: boolean }> = {
  online: { color: 'var(--ok)', glow: true },
  'just-off': { color: 'var(--think)', glow: false },
  offline: { color: 'var(--fg-faint)', glow: false },
};

/** Waheed's status right now, from his working hours; null before mount (server has no clock). */
export function useAvailability(now: Date | null): Availability | null {
  if (!now) return null;
  const { homeTimezone, workHours } = siteConfig;
  return getAvailability(now, homeTimezone.tz, homeTimezone.abbr, workHours);
}

export function StatusDot({ state }: { state: Availability['state'] }) {
  const d = DOT[state];
  return (
    <span
      aria-hidden
      className="size-[7px] shrink-0 rounded-full"
      style={{ background: d.color, boxShadow: d.glow ? `0 0 8px ${d.color}` : undefined }}
    />
  );
}

/** Menu-bar status. Click for his working hours in the visitor's own time, and ways to reach him. */
export function AvailabilityPill({ now }: { now: Date | null }) {
  const info = useAvailability(now);
  const busy = siteConfig.availability === 'busy';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const { abbr, tz } = siteConfig.homeTimezone;
  const { start, end } = siteConfig.workHours;
  // The working hours today, expressed in the visitor's clock.
  const hoursLocal = (() => {
    if (!now) return null;
    const a = getAvailability(now, tz, abbr, siteConfig.workHours);
    return `${formatTime12(a.nextStart)} – ${formatTime12(a.nextEnd)}`;
  })();
  const hourLabel = (h: number) => formatTime12(new Date(Date.UTC(2026, 0, 1, h, 0)), 'UTC');
  const label = busy ? 'Busy' : (info?.label ?? 'Availability');

  return (
    <div ref={ref} className="relative mx-1.5">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={info?.detail}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[22px] items-center gap-1.5 rounded-md px-1.5 transition-colors hover:bg-[var(--hover)]"
      >
        <StatusDot state={busy ? 'offline' : (info?.state ?? 'offline')} />
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Availability"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="glass glass-strong glass-solid absolute top-[26px] right-0 w-72 origin-top-right rounded-2xl p-4 text-left"
          >
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <StatusDot state={busy ? 'offline' : (info?.state ?? 'offline')} />
              {label}
            </p>
            {info && !busy && (
              <p className="mt-0.5 text-[12.5px] text-[var(--fg-muted)]">{info.detail}</p>
            )}
            <dl className="mt-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--fg-muted)]">His hours</dt>
                <dd className="font-medium tabular-nums">
                  {hourLabel(start)} – {hourLabel(end)} {abbr}
                </dd>
              </div>
              {hoursLocal && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--fg-muted)]">In your time</dt>
                  <dd className="font-medium tabular-nums">{hoursLocal}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
              Message any time; he replies fastest while online.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  useOS.getState().openApp('consult');
                  setOpen(false);
                }}
                className="h-7 rounded-lg bg-[var(--accent)] px-3 text-[12.5px] font-medium text-white hover:brightness-110"
              >
                Book a call
              </button>
              <button
                type="button"
                onClick={() => {
                  useOS.getState().openApp('messages');
                  setOpen(false);
                }}
                className="h-7 rounded-lg bg-[var(--control)] px-3 text-[12.5px] font-medium hover:bg-[var(--hover)]"
              >
                Message
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
