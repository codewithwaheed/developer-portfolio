import { describe, expect, it, vi } from 'vitest';
import { handleAgentRequest } from './agentHandler';
import { createMemoryStore } from './memoryStore';
import { FALLBACK_TEXT } from '@/agent/actions';
import type { PortfolioContent } from '@/content/types';

const content: PortfolioContent = {
  about: { html: '', skills: [], photo: '/me.jpg' },
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

function setup() {
  const store = createMemoryStore();
  const logQuestion = vi.spyOn(store, 'logQuestion');
  const ask = vi.fn().mockResolvedValue({ text: 'Rust is fun.', rawToolCalls: [] });
  const env = { cap: 5, ceiling: 200, salt: 's' };
  const handle = (r: { question: unknown; ip?: string }) =>
    handleAgentRequest(
      { question: r.question, ip: r.ip ?? '1.1.1.1' },
      { store, ask, content, env },
    );
  return { store, ask, handle, logQuestion };
}

describe('handleAgentRequest', () => {
  it('rejects empty and oversized questions', async () => {
    const { handle } = setup();
    expect((await handle({ question: '' })).status).toBe(400);
    expect((await handle({ question: '   ' })).status).toBe(400);
    expect((await handle({ question: 42 })).status).toBe(400);
    expect((await handle({ question: 'x'.repeat(501) })).status).toBe(400);
  });

  it('answers, caches and logs', async () => {
    const { handle, ask, logQuestion } = setup();
    const r = await handle({ question: 'Rust vs Go?' });
    expect(r.body).toMatchObject({ source: 'gemini', remaining: 4 });
    const again = await handle({ question: 'rust vs go' });
    expect(again.body).toMatchObject({ source: 'cache' });
    expect(ask).toHaveBeenCalledTimes(1);
    expect(logQuestion).toHaveBeenCalledWith(expect.objectContaining({ source: 'gemini' }));
    expect(logQuestion).toHaveBeenCalledWith(expect.objectContaining({ source: 'cache' }));
  });

  it('sanitizes unknown actions and keeps valid ones', async () => {
    const { handle, ask } = setup();
    ask.mockResolvedValueOnce({ text: 'ok', rawToolCalls: [{ type: 'open_app', app: 'finder' }] });
    expect((await handle({ question: 'new q' })).body).toMatchObject({ actions: [] });
    ask.mockResolvedValueOnce({
      text: 'ok',
      rawToolCalls: [{ type: 'open_project', id: 'zorx' }],
    });
    expect((await handle({ question: 'show zorx' })).body).toMatchObject({
      actions: [{ type: 'open_project', id: 'zorx' }],
    });
  });

  it('enforces the visitor cap', async () => {
    const { handle } = setup();
    for (let i = 0; i < 5; i++) await handle({ question: `unique question ${i}` });
    expect((await handle({ question: 'one more' })).body).toEqual({
      source: 'fallback',
      reason: 'visitor_cap',
      text: FALLBACK_TEXT,
    });
  });

  it('enforces the daily ceiling', async () => {
    const { store, handle } = setup();
    store.consumeDaily = async () => false;
    expect((await handle({ question: 'q' })).body).toMatchObject({
      source: 'fallback',
      reason: 'daily_cap',
    });
  });

  it('maps 429 to quota and other failures to error, never 500', async () => {
    const { store, handle, ask } = setup();
    ask.mockRejectedValueOnce(Object.assign(new Error('quota'), { statusCode: 429 }));
    expect(await handle({ question: 'q', ip: 'other' })).toMatchObject({
      status: 200,
      body: { source: 'fallback', reason: 'quota' },
    });
    ask.mockRejectedValueOnce(new Error('boom'));
    expect(await handle({ question: 'q3', ip: 'o2' })).toMatchObject({
      status: 200,
      body: { source: 'fallback', reason: 'error' },
    });
    store.consumeVisitor = () => Promise.reject(new Error('db down'));
    expect(await handle({ question: 'q2', ip: 'x' })).toMatchObject({
      status: 200,
      body: { source: 'fallback', reason: 'error' },
    });
  });

  it('detects 429 inside a RetryError-shaped error and a bare APICallError', async () => {
    const { handle, ask } = setup();
    const api = Object.assign(new Error('Too many requests'), { statusCode: 429 });
    ask.mockRejectedValueOnce(
      Object.assign(new Error('Failed after 3 attempts. Last error: Too many requests'), {
        name: 'AI_RetryError',
        lastError: api,
        errors: [api, api, api],
      }),
    );
    expect((await handle({ question: 'r1', ip: 'a' })).body).toMatchObject({ reason: 'quota' });
    ask.mockRejectedValueOnce(
      Object.assign(new Error('Retry failed'), { name: 'AI_RetryError', errors: [api] }),
    );
    expect((await handle({ question: 'r2', ip: 'b' })).body).toMatchObject({ reason: 'quota' });
    ask.mockRejectedValueOnce(api);
    expect((await handle({ question: 'r3', ip: 'c' })).body).toMatchObject({ reason: 'quota' });
  });

  it('turns a timeout/abort into a 200 error fallback', async () => {
    const { handle, ask } = setup();
    ask.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'TimeoutError',
      }),
    );
    expect(await handle({ question: 'slow', ip: 't' })).toMatchObject({
      status: 200,
      body: { source: 'fallback', reason: 'error' },
    });
  });

  it('swallows logging failures', async () => {
    const { store, handle } = setup();
    store.logQuestion = () => Promise.reject(new Error('nope'));
    expect((await handle({ question: 'hello there' })).body).toMatchObject({ source: 'gemini' });
  });
});
