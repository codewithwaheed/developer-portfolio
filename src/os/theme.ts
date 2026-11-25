'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { safeStorage } from '@/lib/safeStorage';
import { THEME_KEY } from './themeScript';

export type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function storedTheme(): Theme | null {
  const t = safeStorage.get<unknown>(THEME_KEY, null);
  return t === 'light' || t === 'dark' ? t : null;
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
    ? 'dark'
    : 'light';
}

function applyTheme(t: Theme): void {
  const el = document.documentElement;
  el.dataset.theme = t;
  el.style.colorScheme = t;
}

function getSnapshot(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : (storedTheme() ?? systemTheme());
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mql = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  const onSystem = () => {
    if (storedTheme() === null) applyTheme(systemTheme());
  };
  mql?.addEventListener('change', onSystem);
  return () => {
    observer.disconnect();
    mql?.removeEventListener('change', onSystem);
  };
}

/** Follows the system colour scheme until the visitor toggles; the choice is remembered. */
export function useTheme(): { theme: Theme; toggle(): void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark' as Theme);
  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === 'dark' ? 'light' : 'dark';
    safeStorage.set(THEME_KEY, next);
    applyTheme(next);
  }, []);
  return { theme, toggle };
}
