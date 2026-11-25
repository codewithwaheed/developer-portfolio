import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { MotionGlobalConfig } from 'motion/react';
import { useOS, resetOS } from '../store';
import { Window } from './Window';

// Own file: Motion reads the reduced-motion preference once per module graph.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = false;
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});

afterEach(() => {
  cleanup();
  resetOS();
});

describe('reduced motion', () => {
  it('shows a window at once, without the opacity-0 entrance', () => {
    act(() => useOS.getState().openApp('me'));
    render(<Window id="me">hi</Window>);
    expect(screen.getByRole('dialog', { name: 'me.md' })).toBeVisible();
  });
});
