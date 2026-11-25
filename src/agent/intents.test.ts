// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { getContent } from '@/content/load';
import type { PortfolioContent } from '@/content/types';
import { DEFAULT_CHIPS, memory } from './memory';
import { damerauLevenshtein, intentIds, matchIntent } from './intents';
import { TOUR } from './tour';

let c: PortfolioContent;
beforeAll(async () => {
  c = await getContent();
});

describe('damerauLevenshtein', () => {
  it('counts insert, delete, substitute and transpose as one edit', () => {
    expect(damerauLevenshtein('work', 'work')).toBe(0);
    expect(damerauLevenshtein('workd', 'worked')).toBe(1);
    expect(damerauLevenshtein('hire', 'hrie')).toBe(1);
    expect(damerauLevenshtein('cat', 'dog')).toBe(3);
  });
});

describe('matchIntent', () => {
  it('has at least 30 intents including the required ids', () => {
    const ids = intentIds(c);
    expect(ids.length).toBeGreaterThanOrEqual(30);
    for (const id of [
      'who',
      'experience',
      'ai',
      'blockchain',
      'fintech',
      'web',
      'hire',
      'contact',
      'resume',
      'blog',
      'skills',
      'tour',
    ]) {
      expect(ids).toContain(id);
    }
    for (const id of ['itchatbotassitant', 'vafacosmo', 'financethat', 'omnipresenti'])
      expect(ids).toContain(`project-${id}`);
    for (const j of c.jobs) expect(ids).toContain(`company-${j.slug}`);
  });

  it('maps AI work to the projects app filtered by tag', () => {
    expect(matchIntent('Show me your AI work', c)?.actions).toEqual([
      { type: 'open_app', app: 'projects' },
      { type: 'filter_projects', tag: 'ai' },
      expect.objectContaining({ type: 'say' }),
    ]);
  });

  it('understands hiring and tolerates typos', () => {
    expect(matchIntent('i want to hire you', c)?.id).toBe('hire');
    expect(matchIntent('wher have u workd', c)?.id).toBe('experience');
  });

  it('finds a featured project, even spelled differently', () => {
    expect(matchIntent('tell me about vaffa cosmo', c)?.actions).toContainEqual({
      type: 'open_project',
      id: 'vafacosmo',
    });
    expect(matchIntent('finance that', c)?.id).toBe('project-financethat');
  });

  it('filters by company using the spelling on projects', () => {
    const m = matchIntent('what did you do at renesis', c);
    const filter = m?.actions.find((a) => a.type === 'filter_projects');
    const spelled = c.projects.find((p) => p.company?.toLowerCase() === 'renesis tech')?.company;
    expect(filter).toEqual({ type: 'filter_projects', company: spelled });
  });

  it('returns null when nothing matches', () => {
    expect(matchIntent('what is your opinion on rust vs go for embedded?', c)).toBeNull();
    expect(matchIntent('', c)).toBeNull();
  });

  it('prefers the more specific intent on a tie', () => {
    expect(matchIntent('your AI work', c)?.id).toBe('ai');
  });

  it('every plan ends with a say, and ids resolve to known content', () => {
    const projectIds = new Set(c.projects.map((p) => p.id));
    for (const id of intentIds(c)) {
      const m = matchIntentById(id);
      // the tour hands over to TOUR, which carries its own say lines
      if (id !== 'tour') expect(m.at(-1)?.type).toBe('say');
      for (const a of m) if (a.type === 'open_project') expect(projectIds.has(a.id)).toBe(true);
    }
  });

  it('every memory suggestion chip is understood', () => {
    for (const chip of [...DEFAULT_CHIPS, ...memory.suggestions()])
      expect(matchIntent(chip, c)).not.toBeNull();
    const all = new Set(memory.unseen());
    expect(all.size).toBeGreaterThan(0);
  });

  it('the tour alternates opens with say lines', () => {
    expect(TOUR.map((a) => (a.type === 'open_app' ? a.app : a.type))).toEqual([
      'me',
      'say',
      'experience',
      'say',
      'projects',
      'say',
      'consult',
      'say',
    ]);
  });
});

import { intentPlan } from './intents';
function matchIntentById(id: string) {
  return intentPlan(id, c) ?? [];
}
