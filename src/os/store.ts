import { create } from 'zustand';
import type { ProjectTag } from '@/content/types';
import { appMeta, type AppId } from './apps/registry';

export interface WindowState {
  id: AppId;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
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
  openApp(id: AppId, opts?: { x?: number; y?: number }): void;
  closeApp(id: AppId): void;
  focusApp(id: AppId): void;
  minimizeApp(id: AppId): void;
  moveWindow(id: AppId, x: number, y: number): void;
  setViewport(w: number, h: number): void;
  setProjectFilter(f: ProjectFilter): void;
  openProject(id: string): void;
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

export const useOS = create<OSState & OSActions>()((set) => ({
  ...initialState(),

  openApp: (id, opts) =>
    set((s) => {
      const z = topZ(s.windows) + 1;
      if (s.windows.some((w) => w.id === id)) {
        return {
          windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
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
      const width = appMeta[id].defaultSize.w;
      const cx = clamp(x, MIN_VISIBLE_X - width, s.viewport.w - MIN_VISIBLE_X);
      const cy = clamp(y, MENU_BAR, s.viewport.h - MIN_VISIBLE_Y);
      return {
        windows: s.windows.map((w) => (w.id === id ? { ...w, x: cx, y: cy } : w)),
      };
    }),

  setViewport: (w, h) => set({ viewport: { w, h } }),
  setProjectFilter: (f) => set({ projectFilter: f }),
  openProject: (id) => set({ openProjectId: id }),
  openPost: (slug) => set({ openPostSlug: slug }),
}));

export function resetOS(): void {
  useOS.setState(initialState());
}
