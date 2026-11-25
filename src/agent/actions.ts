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

/** How well Waheed fits a pasted job description (produced by the model, validated here). */
export interface FitReport {
  verdict: 'strong' | 'good' | 'partial';
  summary: string;
  matches: { requirement: string; evidence: string }[];
  gaps: { requirement: string; note: string }[];
  projectIds: string[];
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** Keep only well-formed fields; unknown project ids are dropped. Null when unusable. */
export function sanitizeFit(raw: unknown, projectIds: string[]): FitReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const verdict = r.verdict === 'strong' || r.verdict === 'good' ? r.verdict : 'partial';
  const summary = str(r.summary, 800);
  if (!summary) return null;
  const pairs = <K extends string>(v: unknown, a: 'requirement', b: K, n: number) =>
    (Array.isArray(v) ? v : [])
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const req = str(o[a], 200);
        const other = str(o[b], 300);
        return req && other
          ? ({ requirement: req, [b]: other } as { requirement: string } & Record<K, string>)
          : null;
      })
      .filter((x): x is { requirement: string } & Record<K, string> => x !== null)
      .slice(0, n);
  return {
    verdict,
    summary,
    matches: pairs(r.matches, 'requirement', 'evidence', 8),
    gaps: pairs(r.gaps, 'requirement', 'note', 4),
    projectIds: (Array.isArray(r.projectIds) ? r.projectIds : [])
      .filter((id): id is string => typeof id === 'string' && projectIds.includes(id))
      .slice(0, 3),
  };
}

/** Pasted job descriptions are long and full of hiring vocabulary. */
export function looksLikeJobDescription(text: string): boolean {
  if (text.length >= 600) return true;
  if (text.length < 200) return false;
  return /responsibilit|requirement|qualification|we are looking|you will|what you'll|must have|nice to have|years of experience|job description|\bJD\b/i.test(
    text,
  );
}

/** Longest question the agent accepts (room for a pasted job description). */
export const QUESTION_MAX = 8000;
