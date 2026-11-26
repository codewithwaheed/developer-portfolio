import { create } from 'zustand';
import type { ProjectTag } from '@/content/types';
import { appMeta, type AppId } from './apps/registry';

export interface WindowState {
  id: AppId;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
  /** Size override; the app's default size when absent. */
  w?: number;
  h?: number;
}

export interface ProjectFilter {
  tag?: ProjectTag;
  company?: string;
}

export interface OSState {
  windows: WindowState[];
  focused: AppId | null;
  viewport: { w: number; h: number };
  projectFilter: ProjectFilter;
  openProjectId?: string;
  openPostSlug?: string;
}

export interface OSActions {
  openApp(id: AppId, opts?: { x?: number; y?: number; w?: number; h?: number }): void;
  closeApp(id: AppId): void;
  focusApp(id: AppId): void;
  minimizeApp(id: AppId): void;
  moveWindow(id: AppId, x: number, y: number): void;
  setViewport(w: number, h: number): void;
  setProjectFilter(f: ProjectFilter): void;
  openProject(id: string): void;
  closeProject(): void;
  openPost(slug: string): void;
}

const MENU_BAR = 28;
const MIN_VISIBLE_X = 120;
const MIN_VISIBLE_Y = 40;

const initialState = (): OSState => ({
  windows: [],
  focused: null,
  viewport: { w: 1280, h: 800 },
  projectFilter: {},
});

const topZ = (windows: WindowState[]) => windows.reduce((m, w) => Math.max(m, w.z), 0);

function topVisible(windows: WindowState[]): AppId | null {
  let best: WindowState | null = null;
  for (const w of windows) {
    if (!w.minimized && (!best || w.z > best.z)) best = w;
  }
  return best ? best.id : null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function clampPos(id: AppId, x: number, y: number, viewport: { w: number; h: number }, w?: number) {
  const width = w ?? appMeta[id].defaultSize.w;
  return {
    x: clamp(x, MIN_VISIBLE_X - width, viewport.w - MIN_VISIBLE_X),
    y: clamp(y, MENU_BAR, viewport.h - MIN_VISIBLE_Y),
  };
}

export const useOS = create<OSState & OSActions>()((set) => ({
  ...initialState(),

  openApp: (id, opts) =>
    set((s) => {
      const z = topZ(s.windows) + 1;
      if (s.windows.some((w) => w.id === id)) {
        // Opening an app that is already open raises it, and moves it when told where.
        return {
          windows: s.windows.map((w) =>
            w.id === id
              ? {
                  ...w,
                  z,
                  minimized: false,
                  ...(opts?.x !== undefined && opts?.y !== undefined
                    ? { x: opts.x, y: opts.y }
                    : {}),
                  ...(opts?.w !== undefined && opts?.h !== undefined
                    ? { w: opts.w, h: opts.h }
                    : {}),
                }
              : w,
          ),
          focused: id,
        };
      }
      const n = s.windows.length;
      const win: WindowState = {
        id,
        x: opts?.x ?? 80 + 28 * n,
        y: opts?.y ?? 60 + 28 * n,
        z,
        minimized: false,
        ...(opts?.w !== undefined && opts?.h !== undefined ? { w: opts.w, h: opts.h } : {}),
      };
      return { windows: [...s.windows, win], focused: id };
    }),

  closeApp: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      return {
        windows,
        focused: s.focused === id ? topVisible(windows) : s.focused,
      };
    }),

  focusApp: (id) =>
    set((s) => {
      if (!s.windows.some((w) => w.id === id)) return s;
      const z = topZ(s.windows) + 1;
      return {
        windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
        focused: id,
      };
    }),

  minimizeApp: (id) =>
    set((s) => {
      const windows = s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
      return {
        windows,
        focused: s.focused === id ? topVisible(windows) : s.focused,
      };
    }),

  moveWindow: (id, x, y) =>
    set((s) => {
      const pos = clampPos(id, x, y, s.viewport, s.windows.find((w) => w.id === id)?.w);
      return {
        windows: s.windows.map((w) => (w.id === id ? { ...w, ...pos } : w)),
      };
    }),

  setViewport: (w, h) =>
    set((s) => {
      const viewport = { w, h };
      return {
        viewport,
        windows: s.windows.map((win) => ({
          ...win,
          ...clampPos(win.id, win.x, win.y, viewport, win.w),
        })),
      };
    }),
  setProjectFilter: (f) => set({ projectFilter: f }),
  openProject: (id) => set({ openProjectId: id }),
  closeProject: () => set({ openProjectId: undefined }),
  openPost: (slug) => set({ openPostSlug: slug }),
}));

export function resetOS(): void {
  useOS.setState(initialState());
}
