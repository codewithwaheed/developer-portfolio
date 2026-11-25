import type { PortfolioContent } from '@/content/types';
import { FALLBACK_TEXT, sanitizeActions, type KnownContent } from './actions';
import { useAgent } from './agentStore';
import { matchIntent } from './intents';
import { runAgentPlan } from './run';

/** Chips offered after the model is unavailable. All resolve to scripted intents. */
export const FALLBACK_SUGGESTIONS = [
  'Show me your projects',
  'Where have you worked?',
  'Take the tour',
  'I want to hire you',
];

// Portfolio content is needed to match intents and validate model output.
// AgentOS calls setAskContent(content) once on mount; before that ask() goes straight to the server.
let content: PortfolioContent | null = null;

export function setAskContent(c: PortfolioContent | null): void {
  content = c;
}

function knownOf(c: PortfolioContent | null): KnownContent {
  return {
    projectIds: c?.projects.map((p) => p.id) ?? [],
    postSlugs: c?.posts.map((p) => p.slug) ?? [],
    companies: [...new Set((c?.projects ?? []).flatMap((p) => (p.company ? [p.company] : [])))],
  };
}

/** Fire-and-forget log of a scripted match; the server route is added separately. */
function beacon(question: string, intent: string): void {
  try {
    navigator.sendBeacon?.('/api/agent/log', JSON.stringify({ question, intent }));
  } catch {
    // logging is best effort
  }
}

/** Show the fallback copy, unless a newer run (e.g. the tour) has taken over. */
function fallback(signal: AbortSignal): void {
  if (signal.aborted || useAgent.getState().controller?.signal !== signal) return;
  useAgent.setState({
    reply: FALLBACK_TEXT,
    status: 'idle',
    controller: undefined,
    fallback: true,
  });
}

/** Answer a visitor question: scripted intent first, otherwise the server route. */
export async function ask(question: string): Promise<void> {
  const q = question.trim();
  if (!q) return;
  const signal = useAgent.getState().start();

  const scripted = content ? matchIntent(q, content) : null;
  if (scripted) {
    beacon(q, scripted.id);
    await runAgentPlan(scripted.actions, {
      signal,
      initialLog: [`✓ understood: ${scripted.id}`],
    });
    return;
  }

  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q }),
      signal,
    });
    const data = (await res.json()) as { source?: string; text?: string; actions?: unknown };
    if (signal.aborted) return;
    if (data.source !== 'gemini' && data.source !== 'cache') return fallback(signal);

    const actions = sanitizeActions(data.actions, knownOf(content));
    if (useAgent.getState().controller?.signal !== signal) return;
    if (data.text && !actions.some((a) => a.type === 'say')) {
      useAgent.getState().setReply(data.text);
    }
    await runAgentPlan(actions, { signal });
  } catch {
    fallback(signal);
  }
}
