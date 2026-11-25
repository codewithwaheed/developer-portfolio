import { beforeEach, describe, expect, it } from 'vitest';
import { useOS, resetOS } from './store';

const state = () => useOS.getState();
const win = (id: string) => state().windows.find((w) => w.id === id)!;
const z = (id: string) => win(id).z;

beforeEach(() => resetOS());

describe('window manager store', () => {
  it('opens, focuses and stacks windows without duplicates', () => {
    const { openApp } = state();
    openApp('me');
    openApp('experience');
    expect(state().focused).toBe('experience');
    expect(z('experience')).toBeGreaterThan(z('me'));
    openApp('me');
    expect(state().windows.filter((w) => w.id === 'me')).toHaveLength(1);
    expect(state().focused).toBe('me');
    expect(z('me')).toBeGreaterThan(z('experience'));
  });

  it('cascades new windows and honours explicit position', () => {
    const { openApp } = state();
    openApp('me');
    openApp('experience');
    openApp('projects', { x: 10, y: 40 });
    expect(win('me')).toMatchObject({ x: 80, y: 60 });
    expect(win('experience')).toMatchObject({ x: 108, y: 88 });
    expect(win('projects')).toMatchObject({ x: 10, y: 40 });
  });

  it('clamps moves to keep the window reachable', () => {
    const { openApp, setViewport, moveWindow } = state();
    openApp('me');
    setViewport(1280, 800);
    moveWindow('me', 5000, -300);
    expect(win('me')).toMatchObject({ x: 1280 - 120, y: 28 });
    moveWindow('me', -5000, 5000);
    expect(win('me')).toMatchObject({ x: 120 - 560, y: 800 - 40 });
  });

  it('minimizes, refocuses the top remaining window, and unminimizes on open/focus', () => {
    const { openApp, minimizeApp, focusApp } = state();
    openApp('me');
    openApp('experience');
    minimizeApp('experience');
    expect(win('experience').minimized).toBe(true);
    expect(state().focused).toBe('me');
    minimizeApp('me');
    expect(state().focused).toBeNull();
    openApp('experience');
    expect(win('experience').minimized).toBe(false);
    expect(state().focused).toBe('experience');
    minimizeApp('experience');
    focusApp('experience');
    expect(win('experience').minimized).toBe(false);
  });

  it('closes windows and moves focus to the highest remaining', () => {
    const { openApp, closeApp } = state();
    openApp('me');
    openApp('experience');
    openApp('projects');
    closeApp('projects');
    expect(state().windows.find((w) => w.id === 'projects')).toBeUndefined();
    expect(state().focused).toBe('experience');
    closeApp('experience');
    closeApp('me');
    expect(state().focused).toBeNull();
  });

  it('stores filter, project and post selections', () => {
    const { setProjectFilter, openProject, openPost } = state();
    setProjectFilter({ tag: 'ai', company: 'Acme' });
    openProject('p1');
    openPost('hello');
    expect(state().projectFilter).toEqual({ tag: 'ai', company: 'Acme' });
    expect(state().openProjectId).toBe('p1');
    expect(state().openPostSlug).toBe('hello');
  });

  it('defaults the viewport to 1280x800', () => {
    expect(state().viewport).toEqual({ w: 1280, h: 800 });
  });
});

describe('setViewport', () => {
  it('re-clamps existing windows into the new viewport', () => {
    const { openApp, moveWindow, setViewport } = state();
    openApp('me');
    moveWindow('me', 1100, 700);
    expect(win('me')).toMatchObject({ x: 1100, y: 700 });
    setViewport(800, 600);
    expect(state().viewport).toEqual({ w: 800, h: 600 });
    expect(win('me')).toMatchObject({ x: 800 - 120, y: 600 - 40 });
  });
});
