import { useOS } from '@/os/store';
import { appMeta } from '@/os/apps/registry';
import type { AgentAction } from './actions';
import { runPlan } from './executor';
import { useAgent } from './agentStore';
import { cursor } from './ui/GhostCursor';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Open agent.log in the lower right, out of the way of the windows the agent opens. */
function showAgentLog() {
  const os = useOS.getState();
  if (os.windows.some((w) => w.id === 'agentlog')) return;
  const { w, h } = appMeta.agentlog.defaultSize;
  os.openApp('agentlog', {
    x: Math.max(24, os.viewport.w - w - 24),
    y: Math.max(40, os.viewport.h - h - 120),
  });
}

/**
 * Run a plan on the real desktop: ghost cursor, OS store, agent.log and reply.
 * Reuses the controller from a preceding `start()` (Task 10 calls start, asks, then this).
 */
export async function runAgentPlan(
  actions: AgentAction[],
  opts: { startTour?: () => void } = {},
): Promise<'done' | 'interrupted'> {
  const agent = useAgent.getState();
  const current = agent.controller;
  // Reuse only a fresh start() (thinking, no plan yet); otherwise start() aborts any running plan.
  const reuse = agent.status === 'thinking' && current && !current.signal.aborted;
  const signal = reuse ? current.signal : agent.start();
  const controller = useAgent.getState().controller;

  agent.clearLog();
  agent.setStatus('acting');
  if (actions.some((a) => a.type !== 'say')) showAgentLog();

  const os = useOS.getState();
  try {
    return await runPlan(
      actions,
      {
        moveCursorTo: (selector) => cursor.moveTo(selector),
        click: () => cursor.click(),
        os: {
          openApp: os.openApp,
          closeApp: os.closeApp,
          setProjectFilter: os.setProjectFilter,
          openProject: os.openProject,
          openPost: os.openPost,
        },
        log: (line) => useAgent.getState().pushLog(line),
        say: (text) => useAgent.getState().setReply(text),
        startTour: opts.startTour ?? (() => {}),
        reducedMotion: prefersReducedMotion(),
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
