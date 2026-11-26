import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { AgentOS } from './AgentOS';
import { resetOS, useOS } from '../store';
import type { PortfolioContent } from '@/content/types';

const content: PortfolioContent = {
  about: { html: '<p>hi</p>', skills: [], photo: '/me.jpg' },
  jobs: [],
  projects: [],
  posts: [],
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('agentos.booted', 'true');
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  resetOS();
});

describe('AgentOS lock flow', () => {
  it('wakes on Enter without opening any app behind the lock', async () => {
    render(<AgentOS content={content} />);
    const lock = await screen.findByRole('dialog', { name: 'Lock screen' });
    expect(useOS.getState().windows).toHaveLength(0);
    fireEvent.keyDown(lock, { key: 'Enter' });
    expect(screen.queryByRole('dialog', { name: 'Lock screen' })).toBeNull();
    expect(useOS.getState().windows).toHaveLength(0);
  });
});

describe('AgentOS first paint and modality', () => {
  it('server HTML has an opaque cover and an inert shell; the cover goes once the phase is set', async () => {
    const html = renderToString(<AgentOS content={content} />);
    expect(html).toContain('data-boot-cover');
    expect(html).toMatch(/<div[^>]*(inert=""[^>]*data-shell|data-shell[^>]*inert="")/);
    const { container } = render(<AgentOS content={content} />);
    await screen.findByRole('dialog', { name: 'Lock screen' });
    expect(container.querySelector('[data-boot-cover]')).toBeNull();
  });

  it('the lock screen is modal: Cmd+K does nothing and the dock is inert', async () => {
    render(<AgentOS content={content} />);
    const lock = await screen.findByRole('dialog', { name: 'Lock screen' });
    expect(lock).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('textbox', { name: 'Ask AgentOS' });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(input).not.toHaveFocus();
    const dock = screen.getByRole('navigation', { name: 'Dock' });
    expect(dock.closest('[inert]')).not.toBeNull();
    expect(input.closest('[inert]')).not.toBeNull();

    fireEvent.keyDown(lock, { key: 'Enter' });
    expect(dock.closest('[inert]')).toBeNull();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(input).toHaveFocus();
  });

  it('a route deep link opens the post and skips boot/lock', async () => {
    const withPost = {
      ...content,
      posts: [{ slug: 'hello', title: 'Hello', description: '', date: '', tags: [], html: '' }],
    };
    render(<AgentOS content={withPost} initialDeepLink={{ app: 'pensieve', post: 'hello' }} />);
    await vi.waitFor(() => expect(useOS.getState().windows.map((w) => w.id)).toContain('pensieve'));
    expect(useOS.getState().openPostSlug).toBe('hello');
    expect(screen.queryByRole('dialog', { name: 'Lock screen' })).toBeNull();
  });
});
