import { useOS } from '@/os/store';
import { appMeta, type AppId } from '@/os/apps/registry';
import { tileLayout, type Slot } from '@/os/tile';
import { isMobileViewport } from '@/os/mobile/useIsMobile';
import type { AgentAction } from './actions';
import { runPlan } from './executor';
import { useAgent, LOG_DIVIDER } from './agentStore';
import { cursor } from './ui/GhostCursor';
import { TOUR } from './tour';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const LOG_MAX = 300;
const HOME_SETTLE_MS = 350; // the home screen's spring back to full size
const HOME_WAIT_FRAMES = 30;
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Phones show one app at a time, covering the home screen. Before the agent points at a
 * home-screen icon, close every app and wait for the home screen to be live again, so the
 * pulse ring lands on a visible icon.
 */
async function goHome(reducedMotion: boolean): Promise<void> {
  const os = useOS.getState();
  if (os.windows.length === 0) return;
  os.windows.forEach((w) => os.closeApp(w.id));
  for (let i = 0; i < HOME_WAIT_FRAMES; i++) {
    await nextFrame();
    const grid = document.querySelector('[role="grid"][aria-label="Home screen"]');
    if (grid && !grid.closest('[inert]')) break;
  }
  if (!reducedMotion) await new Promise((r) => setTimeout(r, HOME_SETTLE_MS));
}

/** Apps a plan will put on screen, in the order it opens them. */
function appsOf(actions: AgentAction[]): AppId[] {
  const out: AppId[] = [];
  const add = (id: AppId) => out.includes(id) || out.push(id);
  for (const a of actions) {
    if (a.type === 'open_app') add(a.app);
    else if (a.type === 'open_project') add('projects');
    else if (a.type === 'open_post') add('pensieve');
  }
  return out;
}

/** Open agent.log (in its tile when the plan spreads windows out, else the lower right). */
function showAgentLog(slot?: Slot) {
  const os = useOS.getState();
  if (slot) return os.openApp('agentlog', slot);
  if (os.windows.some((w) => w.id === 'agentlog')) return;
  const { w, h } = appMeta.agentlog.defaultSize;
  os.openApp('agentlog', {
    x: Math.max(24, os.viewport.w - w - 24),
    y: Math.max(40, os.viewport.h - h - 120),
  });
}

/**
 * Run a plan on the real desktop: ghost cursor, OS store, agent.log and reply.
 * Without `signal` the plan begins its own run (start(), aborting whatever is running).
 * With `signal` it continues the run that owns it (ask() calls start(), resolves the
 * question, then this); a superseded or aborted signal returns 'interrupted' at once.
 */
export async function runAgentPlan(
  actions: AgentAction[],
  opts: { startTour?: () => void; signal?: AbortSignal; initialLog?: string[] } = {},
): Promise<'done' | 'interrupted'> {
  const agent = useAgent.getState();
  let signal: AbortSignal;
  if (opts.signal) {
    if (opts.signal.aborted || agent.controller?.signal !== opts.signal) return 'interrupted';
    signal = opts.signal;
  } else {
    signal = agent.start();
  }
  const controller = useAgent.getState().controller;

  // The log keeps the whole session: each run is appended under a divider.
  useAgent.setState((st) => ({
    log: [...st.log, ...(st.log.length ? [LOG_DIVIDER] : []), ...(opts.initialLog ?? [])].slice(
      -LOG_MAX,
    ),
  }));
  agent.setStatus('acting');
  const mobile = isMobileViewport();
  const reducedMotion = prefersReducedMotion();
  const os = useOS.getState();
  // A plan that opens several apps lays them out side by side so the desktop looks full.
  const showLog = !mobile && actions.some((a) => a.type !== 'say');
  const ids = appsOf(actions);
  const slots = mobile
    ? {}
    : tileLayout(showLog ? [...ids, 'agentlog'] : ids, useOS.getState().viewport);
  // Phones are single-app: agent.log would cover the apps the agent opens.
  if (showLog) showAgentLog(slots.agentlog);

  const moveCursorTo = async (selector: string) => {
    if (mobile && selector.startsWith('[data-app-icon')) await goHome(reducedMotion);
    await cursor.moveTo(selector);
  };
  try {
    return await runPlan(
      actions,
      {
        moveCursorTo,
        click: () => cursor.click(),
        os: {
          openApp: (id: AppId) => os.openApp(id, slots[id]),
          closeApp: os.closeApp,
          setProjectFilter: os.setProjectFilter,
          openProject: os.openProject,
          openPost: os.openPost,
        },
        log: (line) => useAgent.getState().pushLog(line),
        say: (text) => useAgent.getState().setReply(text),
        // Starting the tour supersedes the running plan (it is always the last step).
        startTour: opts.startTour ?? (() => void runAgentPlan(TOUR)),
        reducedMotion,
      },
      signal,
    );
  } finally {
    // Only settle if no newer plan has taken over.
    if (useAgent.getState().controller === controller) {
      useAgent.setState({ status: 'idle', controller: undefined });
    }
  }
}
