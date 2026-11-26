'use client';

import { useEffect, useState } from 'react';

/** The current time, ticking every `ms`. Null until mounted (the server cannot know it). */
export function useNow(ms = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
