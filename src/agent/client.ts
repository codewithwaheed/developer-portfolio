import type { PortfolioContent } from '@/content/types';
import {
  FALLBACK_TEXT,
  QUESTION_MAX,
  sanitizeActions,
  sanitizeFit,
  type KnownContent,
} from './actions';
import { useAgent } from './agentStore';
import { matchIntent } from './intents';
import { runAgentPlan } from './run';

/** Questions up to this many words may be answered by a scripted intent without the model. */
export const SCRIPTED_MAX_WORDS = 6;

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
  useAgent.getState().setReply(FALLBACK_TEXT);
  useAgent.setState({ status: 'idle', controller: undefined, fallback: true });
}

/** The conversation so far (before this question), as context for follow-ups. */
function historyBefore(question: string): { role: 'user' | 'agent'; text: string }[] {
  const msgs = useAgent.getState().messages;
  const prior =
    msgs.at(-1)?.role === 'user' && msgs.at(-1)?.text === question ? msgs.slice(0, -1) : msgs;
  return prior.slice(-8).map((m) => ({ role: m.role, text: m.text }));
}

/** Answer a visitor question: scripted intent first, otherwise the server route. */
export async function ask(question: string): Promise<void> {
  const q = question.trim().slice(0, QUESTION_MAX);
  if (!q) return;
  const history = historyBefore(q);
  useAgent.getState().pushUser(q);
  const signal = useAgent.getState().start();

  const scripted = content ? matchIntent(q, content) : null;
  const runScripted = async (match: NonNullable<typeof scripted>) => {
    beacon(q, match.id);
    await runAgentPlan(match.actions, {
      signal,
      initialLog: [`✓ understood: ${match.id}`],
    });
  };
  // Short, command-like questions ("show me your AI work") are answered instantly and free.
  // Anything longer goes to the model for a real answer, with the scripted plan as backup.
  if (scripted && q.split(/\s+/).length <= SCRIPTED_MAX_WORDS) {
    await runScripted(scripted);
    return;
  }

  const unavailable = async () => {
    if (scripted && !signal.aborted && useAgent.getState().controller?.signal === signal) {
      await runScripted(scripted);
    } else {
      fallback(signal);
    }
  };

  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q, history }),
      signal,
    });
    const data = (await res.json()) as {
      source?: string;
      text?: string;
      actions?: unknown;
      fit?: unknown;
    };
    if (signal.aborted) return;
    if (data.source !== 'gemini' && data.source !== 'cache') return unavailable();

    const known = knownOf(content);
    const actions = sanitizeActions(data.actions, known);
    const fit = data.fit ? sanitizeFit(data.fit, known.projectIds) : null;
    if (useAgent.getState().controller?.signal !== signal) return;
    if (!actions.some((a) => a.type === 'say')) {
      const text = typeof data.text === 'string' && data.text.trim() ? data.text : 'Here you go.';
      useAgent.getState().setReply(text, fit ?? undefined);
    }
    await runAgentPlan(actions, { signal });
  } catch {
    if (!signal.aborted) await unavailable();
  }
}
