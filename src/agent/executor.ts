import type { OSActions } from '@/os/store';
import { appMeta, type AppId } from '@/os/apps/registry';
import type { ProjectTag } from '@/content/types';
import type { AgentAction } from './actions';

export interface ExecutorDeps {
  moveCursorTo(selector: string): Promise<void>;
  click(): Promise<void>;
  os: Pick<OSActions, 'openApp' | 'closeApp' | 'setProjectFilter' | 'openProject' | 'openPost'>;
  log(line: string): void;
  say(text: string): void;
  startTour(): void;
  reducedMotion: boolean;
}

const STEP_PAUSE_MS = 250;

const TAG_LABEL: Record<ProjectTag, string> = {
  ai: 'AI',
  blockchain: 'Blockchain',
  fintech: 'Fintech',
  web: 'Web',
};

const iconOf = (app: AppId) => `[data-app-icon="${app}"]`;

/** Resolves after `ms`, or as soon as the signal aborts. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(t);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const t = setTimeout(done, ms);
    signal.addEventListener('abort', done);
  });
}

/** Animate a plan on the desktop. Stops as soon as `signal` aborts. */
export async function runPlan(
  actions: AgentAction[],
  deps: ExecutorDeps,
  signal: AbortSignal,
): Promise<'done' | 'interrupted'> {
  const { os, log } = deps;

  // Glide to a target and click it. Returns false if interrupted on the way.
  const pointAt = async (selector: string): Promise<boolean> => {
    if (deps.reducedMotion) return true;
    await deps.moveCursorTo(selector);
    if (signal.aborted) return false;
    await deps.click();
    return !signal.aborted;
  };

  const openApp = async (app: AppId): Promise<boolean> => {
    if (!(await pointAt(iconOf(app)))) return false;
    os.openApp(app);
    return true;
  };

  const step = async (a: AgentAction): Promise<boolean> => {
    switch (a.type) {
      case 'open_app':
        if (!(await openApp(a.app))) return false;
        log(`✓ opened ${appMeta[a.app].title}`);
        return true;
      case 'close_app':
        if (!(await pointAt(iconOf(a.app)))) return false;
        os.closeApp(a.app);
        log(`✓ closed ${appMeta[a.app].title}`);
        return true;
      case 'filter_projects': {
        const f: { tag?: ProjectTag; company?: string } = {};
        if (a.tag) f.tag = a.tag;
        if (a.company) f.company = a.company;
        os.setProjectFilter(f);
        const by = [a.tag && TAG_LABEL[a.tag], a.company].filter(Boolean).join(' at ');
        log(by ? `✓ filtered by ${by}` : '✓ cleared project filters');
        return true;
      }
      case 'open_project':
        if (!(await openApp('projects'))) return false;
        if (!(await pointAt(`[data-project-id="${a.id}"]`))) return false;
        os.openProject(a.id);
        log(`✓ opened project ${a.id}`);
        return true;
      case 'open_post':
        if (!(await openApp('pensieve'))) return false;
        os.openPost(a.slug);
        log(`✓ reading ${a.slug}`);
        return true;
      case 'start_tour':
        deps.startTour();
        log('✓ started the tour');
        return true;
      case 'say':
        deps.say(a.text);
        return true;
    }
  };

  for (let i = 0; i < actions.length; i++) {
    if (signal.aborted) return 'interrupted';
    if (i > 0 && !deps.reducedMotion) {
      await pause(STEP_PAUSE_MS, signal);
      if (signal.aborted) return 'interrupted';
    }
    const ok = await step(actions[i]);
    if (!ok || signal.aborted) return 'interrupted';
  }
  return 'done';
}
