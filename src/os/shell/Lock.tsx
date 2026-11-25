'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { siteConfig } from '@/config/site';
import { formatClock } from './clock';

export function Lock({ onWake }: { onWake: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    ref.current?.focus();
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onWake();
    }
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Lock screen"
      tabIndex={-1}
      onClick={onWake}
      onKeyDown={onKeyDown}
      className="glass fixed inset-0 z-[2000] flex cursor-pointer flex-col items-center justify-center rounded-none text-center outline-none"
    >
      <div className="text-[72px] leading-none font-light tabular-nums">
        {formatClock(siteConfig.homeTimezone.tz, now)}
      </div>
      <div className="mt-6 text-[22px] font-medium">{siteConfig.name}</div>
      <div className="mt-1 text-[14px] opacity-70">{siteConfig.title}</div>
      <div className="mt-10 animate-pulse text-[13px] opacity-60">click to wake</div>
      <a
        href="/classic"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="absolute bottom-6 text-[12px] opacity-50 underline hover:opacity-90"
      >
        classic view
      </a>
    </div>
  );
}
