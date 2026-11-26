import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentOS } from '../shell/AgentOS';
import { resetOS, useOS } from '../store';
import { runAgentPlan } from '@/agent/run';
import { resetAgent } from '@/agent/agentStore';
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
  resetAgent();
  vi.unstubAllGlobals();
});

describe('AgentOS Mobile', () => {
  it('shows a home screen; apps open full-screen and Back closes them', async () => {
    const user = userEvent.setup();
    render(<AgentOS content={content} />);
    expect(screen.queryByRole('navigation', { name: 'Dock' })).toBeNull();

    // Waking lands on the home screen; no app opens behind the lock.
    fireEvent.keyDown(await screen.findByRole('dialog', { name: 'Lock screen' }), { key: 'Enter' });
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
    // Single-app model: the tap closed me.md, so Back goes straight home.
    expect(state().windows.map((w) => w.id)).toEqual(['projects']);
  });

  it('has a status bar with availability and a mute toggle', () => {
    render(<AgentOS content={content} />);
    const bar = screen.getByRole('banner', { name: 'Status bar' });
    expect(within(bar).getByText(/online now|just got off work|offline/i)).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /mute sounds/i })).toBeInTheDocument();
  });
  it('runs agent plans one app at a time, without agent.log, and Back goes home', async () => {
    const user = userEvent.setup();
    render(<AgentOS content={content} />);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Lock screen' }), { key: 'Enter' });
    const opened: string[] = [];
    const off = useOS.subscribe((s) => s.windows.forEach((w) => opened.push(w.id)));

    await act(() =>
      runAgentPlan([
        { type: 'open_app', app: 'projects' },
        { type: 'open_app', app: 'experience' },
      ]),
    );
    off();

    expect(opened).not.toContain('agentlog');
    expect(state().windows.map((w) => w.id)).toEqual(['experience']);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(state().windows).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('grid', { name: 'Home screen' })).toBeVisible());
  }, 10_000);
});
