export type AppId =
  | 'me'
  | 'experience'
  | 'projects'
  | 'consult'
  | 'pensieve'
  | 'messages'
  | 'resume'
  | 'terminal'
  | 'settings'
  | 'agentlog';

export const APP_IDS: readonly AppId[] = [
  'me',
  'experience',
  'projects',
  'consult',
  'pensieve',
  'messages',
  'resume',
  'terminal',
  'settings',
  'agentlog',
];

export function isAppId(x: unknown): x is AppId {
  return typeof x === 'string' && (APP_IDS as readonly string[]).includes(x);
}

export interface AppMeta {
  title: string;
  icon: string;
  tint: [string, string];
  defaultSize: { w: number; h: number };
  inDock: boolean;
}

export const appMeta: Record<AppId, AppMeta> = {
  me: {
    title: 'me.md',
    icon: 'file-text',
    tint: ['#8ea2ff', '#5b6cff'],
    defaultSize: { w: 560, h: 480 },
    inDock: false,
  },
  experience: {
    title: 'experience.app',
    icon: 'cpu',
    tint: ['#5eead4', '#0ea5a4'],
    defaultSize: { w: 640, h: 500 },
    inDock: true,
  },
  projects: {
    title: 'projects/',
    icon: 'folder',
    tint: ['#fcd34d', '#f59e0b'],
    defaultSize: { w: 720, h: 520 },
    inDock: true,
  },
  consult: {
    title: 'consult.cal',
    icon: 'calendar',
    tint: ['#fda4af', '#f43f5e'],
    defaultSize: { w: 600, h: 520 },
    inDock: true,
  },
  pensieve: {
    title: 'pensieve',
    icon: 'notebook',
    tint: ['#c4b5fd', '#8b5cf6'],
    defaultSize: { w: 680, h: 520 },
    inDock: true,
  },
  messages: {
    title: 'messages',
    icon: 'message-circle',
    tint: ['#86efac', '#22c55e'],
    defaultSize: { w: 420, h: 540 },
    inDock: true,
  },
  resume: {
    title: 'resume.pdf',
    icon: 'file-type-pdf',
    tint: ['#fca5a5', '#ef4444'],
    defaultSize: { w: 640, h: 560 },
    inDock: false,
  },
  terminal: {
    title: 'terminal',
    icon: 'terminal-2',
    tint: ['#475569', '#0f172a'],
    defaultSize: { w: 640, h: 420 },
    inDock: true,
  },
  settings: {
    title: 'Settings',
    icon: 'settings',
    tint: ['#cbd5e1', '#64748b'],
    defaultSize: { w: 480, h: 420 },
    inDock: true,
  },
  agentlog: {
    title: 'agent.log',
    icon: 'list-details',
    tint: ['#7dd3fc', '#0284c7'],
    defaultSize: { w: 560, h: 400 },
    inDock: false,
  },
};
