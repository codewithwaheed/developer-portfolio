'use client';

import { useSyncExternalStore } from 'react';

export const MOBILE_QUERY = '(max-width: 767px)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY)
    : null;
}

/** Plain check for non-React code (the agent runner). */
export function isMobileViewport(): boolean {
  return query()?.matches ?? false;
}

function subscribe(onChange: () => void): () => void {
  const mql = query();
  if (!mql?.addEventListener) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** True below 768px. The server (and hydration) always renders the desktop. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileViewport, () => false);
}
