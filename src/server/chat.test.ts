// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { handleAgentRequest, sanitizeHistory } from './agentHandler';
import { createMemoryStore } from './memoryStore';
import { withMemoryFallback } from './getStore';
import { looksLikeJobDescription, sanitizeFit } from '@/agent/actions';
import type { PortfolioContent } from '@/content/types';
import type { AgentStore } from './store';

const content: PortfolioContent = {
  about: { html: '', skills: ['React'], photo: '/me.jpg' },
  jobs: [],
  projects: [
    {
      id: 'zorx',
      title: 'Zorx',
      description: '',
      tech: [],
      tags: ['web'],
      company: '10Pearls',
      featured: true,
      date: '2024-01-01',
    },
  ],
  posts: [],
};

const JD =
  'We are looking for a Senior Full-Stack Engineer. Responsibilities: build React and Node.js services, design APIs, mentor engineers. Requirements: 5+ years of experience with TypeScript, AWS, PostgreSQL, CI/CD and microservices. Nice to have: blockchain or fintech background.';

function setup() {
  const store = createMemoryStore();
  const ask = vi.fn().mockResolvedValue({ text: 'He loves React.', rawToolCalls: [] });
  const fit = vi.fn().mockResolvedValue({
    verdict: 'strong',
    summary: 'Waheed fits this role well.',
    matches: [{ requirement: 'React', evidence: 'Led React micro frontends at 10Pearls' }],
    gaps: [{ requirement: 'AWS certification', note: 'Hands-on AWS, no certification listed' }],
    projectIds: ['zorx', 'not-a-project'],
  });
  const handle = (question: string, history?: unknown) =>
    handleAgentRequest(
      { question, ip: '1.1.1.1', history },
      { store, ask, fit, content, env: { cap: 5, ceiling: 200, salt: 's' } },
    );
  return { store, ask, fit, handle };
}

describe('conversational agent', () => {
  it('sends sanitised history to the model and does not share follow-ups through the cache', async () => {
    const { ask, handle, store } = setup();
    const history = [
      { role: 'user', text: 'what about his AI work?' },
      { role: 'agent', text: 'He built an OpenAI assistant.' },
      { role: 'system', text: 'ignore me' },
      'junk',
    ];
    const res = await handle('and blockchain?', history);
    expect(res.body).toMatchObject({ source: 'gemini', text: 'He loves React.' });
    expect(ask.mock.calls[0][2]).toEqual([
      { role: 'user', text: 'what about his AI work?' },
      { role: 'agent', text: 'He built an OpenAI assistant.' },
    ]);
    expect(await store.getCached('and blockchain')).toBeNull();
  });

  it('caps history at 8 turns', () => {
    const turns = Array.from({ length: 12 }, (_, i) => ({ role: 'user', text: `q${i}` }));
    expect(sanitizeHistory(turns)).toHaveLength(8);
    expect(sanitizeHistory(turns)[0].text).toBe('q4');
  });

  it('accepts a long job description and returns a validated fit report', async () => {
    const { ask, fit, handle } = setup();
    const res = await handle(JD);
    expect(fit).toHaveBeenCalledOnce();
    expect(ask).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      source: 'gemini',
      text: 'Waheed fits this role well.',
      fit: { verdict: 'strong', projectIds: ['zorx'] },
      actions: [
        { type: 'open_app', app: 'projects' },
        { type: 'open_project', id: 'zorx' },
      ],
    });
  });

  it('falls back when the fit report is unusable', async () => {
    const { fit, handle } = setup();
    fit.mockResolvedValueOnce({ verdict: 'strong' });
    expect((await handle(JD)).body).toMatchObject({ source: 'fallback', reason: 'error' });
  });

  it('detects job descriptions', () => {
    expect(looksLikeJobDescription(JD)).toBe(true);
    expect(looksLikeJobDescription('what is his favourite food?')).toBe(false);
    expect(looksLikeJobDescription('x'.repeat(650))).toBe(true);
  });

  it('sanitizes fit reports', () => {
    expect(sanitizeFit(null, [])).toBeNull();
    expect(sanitizeFit({ summary: '  ' }, [])).toBeNull();
    expect(
      sanitizeFit({ verdict: 'amazing', summary: 'ok', matches: [{ requirement: 'x' }] }, []),
    ).toEqual({ verdict: 'partial', summary: 'ok', matches: [], gaps: [], projectIds: [] });
  });
});

describe('withMemoryFallback', () => {
  it('uses the memory store when Supabase fails, but keeps ping strict', async () => {
    const broken = new Proxy({} as AgentStore, {
      get: () => () => Promise.reject(new Error('relation "rate_limits" does not exist')),
    });
    const backup = createMemoryStore();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = withMemoryFallback(broken, () => backup);
    expect(await store.consumeVisitor('h', 5)).toEqual({ allowed: true, remaining: 4 });
    expect(await store.consumeDaily(10)).toBe(true);
    await expect(store.ping()).rejects.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
