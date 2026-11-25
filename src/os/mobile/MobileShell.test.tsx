import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentOS } from '../shell/AgentOS';
import { resetOS, useOS } from '../store';
import type { PortfolioContent } from '@/content/types';

const content: PortfolioContent = {
  about: { html: '<p>hi</p>', skills: [], photo: '/me.jpg' },
  jobs: [],
  projects: [],
  posts: [],
};

const state = () => useOS.getState();
const icon = (id: string) => document.querySelector(`[data-app-icon="${id}"]`) as HTMLElement;

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('agentos.booted', 'true');
  window.history.replaceState(null, '', '/');
  // A phone: the mobile query matches, reduced motion does not.
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query === '(max-width: 767px)',
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
  vi.unstubAllGlobals();
});

describe('AgentOS Mobile', () => {
  it('shows a home screen; apps open full-screen and Back closes them', async () => {
    const user = userEvent.setup();
    render(<AgentOS content={content} />);
    expect(screen.queryByRole('navigation', { name: 'Dock' })).toBeNull();

    // Waking opens me.md full-screen; Back returns to the home screen.
    fireEvent.keyDown(await screen.findByRole('dialog', { name: 'Lock screen' }), { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'me.md' })).toHaveStyle({ inset: '0' });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(state().windows).toHaveLength(0);

    const grid = screen.getByRole('grid', { name: 'Home screen' });
    expect(grid).toBeVisible();
    for (const id of ['me', 'resume', 'experience', 'projects', 'messages', 'settings']) {
      expect(grid.querySelector(`[data-app-icon="${id}"]`)).toBeInTheDocument();
    }

    await user.click(icon('experience'));
    expect(screen.getByRole('dialog', { name: 'experience.app' })).toHaveStyle({ inset: '0' });
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(state().windows).toHaveLength(0);
  });

  it('shows only the most recently opened app', async () => {
    render(<AgentOS content={content} />);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Lock screen' }), { key: 'Enter' });
    fireEvent.click(icon('projects'));
    expect(screen.getByRole('dialog', { name: 'projects/' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'me.md' })).toBeNull());
  });

  it('has a status bar with availability and a mute toggle', () => {
    render(<AgentOS content={content} />);
    const bar = screen.getByRole('banner', { name: 'Status bar' });
    expect(within(bar).getByText('open for work')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /mute sounds/i })).toBeInTheDocument();
  });
});
