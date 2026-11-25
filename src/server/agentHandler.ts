import 'server-only';
import { FALLBACK_TEXT, sanitizeActions, type AgentAction } from '@/agent/actions';
import type { PortfolioContent } from '@/content/types';
import { hashIp, normalizeQuestion, type AgentStore } from './store';
import type { askGemini } from './gemini';
import { buildSystemPrompt } from './prompt';

export type AgentResponse =
  | { source: 'gemini' | 'cache'; text: string; actions: AgentAction[]; remaining: number }
  | {
      source: 'fallback';
      reason: 'visitor_cap' | 'daily_cap' | 'quota' | 'error';
      text: string;
    };

export interface HandlerDeps {
  store: AgentStore;
  ask: typeof askGemini;
  content: PortfolioContent;
  env: { cap: number; ceiling: number; salt: string };
}

const MAX_LEN = 500;
/** Longer answers are served but never cached: a shared cache must not amplify odd output. */
export const MAX_CACHED_TEXT = 600;

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
  req: { question: unknown; ip: string },
  deps: HandlerDeps,
): Promise<{ status: number; body: AgentResponse | { error: string } }> {
  const { store, ask, content, env } = deps;
  if (typeof req.question !== 'string') return { status: 400, body: { error: 'invalid question' } };
  const question = req.question.trim();
  if (!question || question.length > MAX_LEN) {
    return { status: 400, body: { error: 'invalid question' } };
  }

  const log = (source: 'gemini' | 'cache' | 'fallback') =>
    store.logQuestion({ question, intent: null, source }).catch(() => {});

  try {
    const key = normalizeQuestion(question);
    const cached = await store.getCached(key);
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

    const { text, rawToolCalls } = await ask(question, buildSystemPrompt(content));
    const actions = sanitizeActions(rawToolCalls, {
      projectIds: content.projects.map((p) => p.id),
      postSlugs: content.posts.map((p) => p.slug),
      companies: [
        ...new Set(
          content.jobs
            .map((j) => j.company)
            .concat(content.projects.flatMap((p) => p.company ?? [])),
        ),
      ],
    });
    if (cacheable(text, actions)) await store.setCached(key, { text, actions }).catch(() => {});
    await log('gemini');
    return { status: 200, body: { source: 'gemini', text, actions, remaining: visitor.remaining } };
  } catch (e) {
    await log('fallback');
    return { status: 200, body: fallback(isQuota(e) ? 'quota' : 'error') };
  }
}
