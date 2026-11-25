import type { ProjectTag } from '@/content/types';
import { isAppId, type AppId } from '@/os/apps/registry';

export type AgentAction =
  | { type: 'open_app'; app: AppId }
  | { type: 'close_app'; app: AppId }
  | { type: 'filter_projects'; tag?: ProjectTag; company?: string }
  | { type: 'open_project'; id: string }
  | { type: 'open_post'; slug: string }
  | { type: 'start_tour' }
  | { type: 'say'; text: string };

export interface KnownContent {
  projectIds: string[];
  postSlugs: string[];
  companies: string[];
}

/** Shown when the model is unavailable; shared by client and server. */
export const FALLBACK_TEXT =
  "My neural core is cooling down. Here's what I can show you right now:";

export const SAY_MAX = 600;

const PROJECT_TAGS: readonly ProjectTag[] = ['ai', 'blockchain', 'fintech', 'web'];

const isTag = (x: unknown): x is ProjectTag =>
  typeof x === 'string' && (PROJECT_TAGS as readonly string[]).includes(x);

function sanitizeOne(a: unknown, known: KnownContent): AgentAction | null {
  if (typeof a !== 'object' || a === null) return null;
  const r = a as Record<string, unknown>;
  switch (r.type) {
    case 'open_app':
    case 'close_app':
      return isAppId(r.app) ? { type: r.type, app: r.app } : null;
    case 'open_project':
      return typeof r.id === 'string' && known.projectIds.includes(r.id)
        ? { type: 'open_project', id: r.id }
        : null;
    case 'open_post':
      return typeof r.slug === 'string' && known.postSlugs.includes(r.slug)
        ? { type: 'open_post', slug: r.slug }
        : null;
    case 'filter_projects': {
      const out: AgentAction & { type: 'filter_projects' } = { type: 'filter_projects' };
      if (r.tag !== undefined) {
        if (!isTag(r.tag)) return null;
        out.tag = r.tag;
      }
      if (r.company !== undefined) {
        const wanted = typeof r.company === 'string' ? r.company.trim().toLowerCase() : null;
        const match = known.companies.find((c) => c.toLowerCase() === wanted);
        if (!match) return null;
        out.company = match;
      }
      return out;
    }
    case 'start_tour':
      return { type: 'start_tour' };
    case 'say':
      return typeof r.text === 'string' && r.text.trim()
        ? { type: 'say', text: r.text.slice(0, SAY_MAX) }
        : null;
    default:
      return null;
  }
}

/** Strictly validate untrusted (model or network) output into known-safe actions. */
export function sanitizeActions(raw: unknown, known: KnownContent): AgentAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((a) => {
    const s = sanitizeOne(a, known);
    return s ? [s] : [];
  });
}
