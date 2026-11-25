import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('wakes on Enter and opens the me window', async () => {
    render(<AgentOS content={content} />);
    const lock = await screen.findByRole('dialog', { name: 'Lock screen' });
    expect(useOS.getState().windows).toHaveLength(0);
    fireEvent.keyDown(lock, { key: 'Enter' });
    expect(useOS.getState().windows.map((w) => w.id)).toContain('me');
  });
});
