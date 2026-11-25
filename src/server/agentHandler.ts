import 'server-only';
import {
  FALLBACK_TEXT,
  QUESTION_MAX,
  looksLikeJobDescription,
  sanitizeActions,
  sanitizeFit,
  type AgentAction,
  type FitReport,
} from '@/agent/actions';
import type { PortfolioContent } from '@/content/types';
import { hashIp, normalizeQuestion, type AgentStore } from './store';
import type { askFit, askGemini, Turn } from './gemini';
import { buildFitPrompt, buildSystemPrompt } from './prompt';

export type AgentResponse =
  | {
      source: 'gemini' | 'cache';
      text: string;
      actions: AgentAction[];
      remaining: number;
      fit?: FitReport;
    }
  | {
      source: 'fallback';
      reason: 'visitor_cap' | 'daily_cap' | 'quota' | 'error';
      text: string;
    };

export interface HandlerDeps {
  store: AgentStore;
  ask: typeof askGemini;
  /** Structured job-description fit; optional so older callers/tests keep working. */
  fit?: typeof askFit;
  content: PortfolioContent;
  env: { cap: number; ceiling: number; salt: string };
}

/** Longer answers are served but never cached: a shared cache must not amplify odd output. */
export const MAX_CACHED_TEXT = 1200;
/** Earlier turns sent as context: at most this many, each trimmed. */
const HISTORY_TURNS = 8;
const HISTORY_CHARS = 1200;

/** Validate the client's conversation history; anything malformed is dropped. */
export function sanitizeHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((t): Turn[] => {
      const o = (t ?? {}) as Record<string, unknown>;
      if ((o.role !== 'user' && o.role !== 'agent') || typeof o.text !== 'string') return [];
      const text = o.text.trim().slice(0, HISTORY_CHARS);
      return text ? [{ role: o.role, text }] : [];
    })
    .slice(-HISTORY_TURNS);
}

/** Only cache answers that say something, within the length limit. */
function cacheable(text: string, actions: AgentAction[]): boolean {
  if (text.length > MAX_CACHED_TEXT) return false;
  return text.trim() !== '' || actions.some((a) => a.type === 'say');
}

const fallback = (reason: 'visitor_cap' | 'daily_cap' | 'quota' | 'error'): AgentResponse => ({
  source: 'fallback',
  reason,
  text: FALLBACK_TEXT,
});

type ErrLike = {
  statusCode?: number;
  status?: number;
  message?: string;
  lastError?: unknown;
  errors?: unknown[];
};

/** Detects a 429 on the error itself, a RetryError's lastError/errors, or a quota message. */
function isQuota(e: unknown, depth = 0): boolean {
  const err = e as ErrLike | null;
  if (!err || typeof err !== 'object' || depth > 3) return false;
  if (err.statusCode === 429 || err.status === 429) return true;
  if (/quota|resource[_ ]exhausted/i.test(String(err.message ?? ''))) return true;
  if (err.lastError && isQuota(err.lastError, depth + 1)) return true;
  return Array.isArray(err.errors) && err.errors.some((x) => isQuota(x, depth + 1));
}

export async function handleAgentRequest(
  req: { question: unknown; ip: string; history?: unknown },
  deps: HandlerDeps,
): Promise<{ status: number; body: AgentResponse | { error: string } }> {
  const { store, ask, fit, content, env } = deps;
  if (typeof req.question !== 'string') return { status: 400, body: { error: 'invalid question' } };
  const question = req.question.trim();
  if (!question || question.length > QUESTION_MAX) {
    return { status: 400, body: { error: 'invalid question' } };
  }

  const log = (source: 'gemini' | 'cache' | 'fallback') =>
    store.logQuestion({ question, intent: null, source }).catch(() => {});

  const history = sanitizeHistory(req.history);
  const isFit = Boolean(fit) && looksLikeJobDescription(question);
  // Only stand-alone questions are shared through the cache; follow-ups depend on context.
  const shareable = history.length === 0 && !isFit;

  try {
    const key = normalizeQuestion(question);
    const cached = shareable ? await store.getCached(key) : null;
    if (cached) {
      await log('cache');
      return { status: 200, body: { source: 'cache', ...cached, remaining: -1 } };
    }

    const visitor = await store.consumeVisitor(hashIp(req.ip, env.salt), env.cap);
    if (!visitor.allowed) {
      await log('fallback');
      return { status: 200, body: fallback('visitor_cap') };
    }
    if (!(await store.consumeDaily(env.ceiling))) {
      await log('fallback');
      return { status: 200, body: fallback('daily_cap') };
    }

    const projectIds = content.projects.map((p) => p.id);
    if (isFit && fit) {
      const report = sanitizeFit(await fit(question, buildFitPrompt(content)), projectIds);
      if (!report) throw new Error('unusable fit report');
      await log('gemini');
      const actions: AgentAction[] = report.projectIds.length
        ? [
            { type: 'open_app', app: 'projects' },
            { type: 'open_project', id: report.projectIds[0] },
          ]
        : [{ type: 'open_app', app: 'experience' }];
      return {
        status: 200,
        body: {
          source: 'gemini',
          text: report.summary,
          actions,
          fit: report,
          remaining: visitor.remaining,
        },
      };
    }

    const { text, rawToolCalls } = await ask(question, buildSystemPrompt(content), history);
    const actions = sanitizeActions(rawToolCalls, {
      projectIds,
      postSlugs: content.posts.map((p) => p.slug),
      companies: [
        ...new Set(
          content.jobs
            .map((j) => j.company)
            .concat(content.projects.flatMap((p) => p.company ?? [])),
        ),
      ],
    });
    if (shareable && cacheable(text, actions))
      await store.setCached(key, { text, actions }).catch(() => {});
    await log('gemini');
    return { status: 200, body: { source: 'gemini', text, actions, remaining: visitor.remaining } };
  } catch (e) {
    await log('fallback');
    return { status: 200, body: fallback(isQuota(e) ? 'quota' : 'error') };
  }
}
