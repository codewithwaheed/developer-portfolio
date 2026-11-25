import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Boot } from './Boot';
import { AgentOS } from './AgentOS';
import { resetOS } from '../store';
import type { PortfolioContent } from '@/content/types';

const content: PortfolioContent = {
  about: { html: '<p>hi</p>', skills: [], photo: '/me.jpg' },
  jobs: [],
  projects: [],
  posts: [],
};

const booted = () => window.localStorage.getItem('agentos.booted');

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  cleanup();
  resetOS();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Boot', () => {
  it('skips on keydown and records the boot', () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(1));
    fireEvent.keyDown(window, { key: 'a' });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(booted()).toBe('true');
  });

  it('skips on pointerdown', () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(1));
    fireEvent.pointerDown(window);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('completes on its own and records the boot', () => {
    const onDone = vi.fn();
    render(<Boot onDone={onDone} />);
    act(() => void vi.advanceTimersByTime(3500));
    expect(screen.getByRole('status')).toHaveTextContent('agent ready');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(booted()).toBe('true');
  });

  it('cleans up on unmount', () => {
    const onDone = vi.fn();
    const { unmount } = render(<Boot onDone={onDone} />);
    unmount();
    act(() => void vi.advanceTimersByTime(5000));
    fireEvent.keyDown(window, { key: 'a' });
    expect(onDone).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('AgentOS restart', () => {
  const restart = () => {
    fireEvent.click(screen.getByRole('button', { name: /AgentOS/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Restart' }));
  };

  it('reaches boot and is not skipped by its own click', () => {
    window.localStorage.setItem('agentos.booted', 'true');
    render(<AgentOS content={content} />);
    act(() => void vi.advanceTimersByTime(1));
    restart();
    expect(screen.getByRole('status', { name: 'Booting' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.getByRole('status', { name: 'Booting' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog', { name: 'Lock screen' })).toBeInTheDocument();
  });

  it('goes straight to lock under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduced-motion'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(<AgentOS content={content} />);
    act(() => void vi.advanceTimersByTime(1));
    restart();
    expect(screen.queryByRole('status', { name: 'Booting' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Lock screen' })).toBeInTheDocument();
  });
});
