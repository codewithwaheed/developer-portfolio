import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from '@/server/memoryStore';
import type { AgentStore } from '@/server/store';
import { LOG_CAP, resetSaltWarning } from '@/server/request';

let store: AgentStore;
let failing = false;
vi.mock('@/server/getStore', () => ({
  getAgentStore: () =>
    failing ? { ...store, logQuestion: () => Promise.reject(new Error('db')) } : store,
}));

import { POST } from './route';

const req = (body: unknown, ip = '1.2.3.4') =>
  new Request('http://x/api/agent/log', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

let logQuestion: ReturnType<typeof vi.spyOn>;

describe('POST /api/agent/log', () => {
  beforeEach(() => {
    store = createMemoryStore();
    logQuestion = vi.spyOn(store, 'logQuestion');
    failing = false;
    vi.stubEnv('IP_HASH_SALT', 'test-salt');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetSaltWarning();
  });

  it('logs a scripted question', async () => {
    const res = await POST(req({ question: ' hi ', intent: 'greet' }));
    expect(res.status).toBe(204);
    expect(logQuestion).toHaveBeenCalledWith({
      question: 'hi',
      intent: 'greet',
      source: 'scripted',
    });
  });

  it('204s on invalid input without logging', async () => {
    expect((await POST(req({ question: '', intent: 'a' }))).status).toBe(204);
    expect((await POST(req({ question: 'x'.repeat(501), intent: 'a' }))).status).toBe(204);
    expect((await POST(req('not json'))).status).toBe(204);
    expect(logQuestion).not.toHaveBeenCalled();
  });

  it('only accepts known-intent-shaped ids', async () => {
    for (const intent of ['Hire', 'drop table;', 'a b', '', 'x'.repeat(65), 7, 'über']) {
      expect((await POST(req({ question: 'q', intent }))).status).toBe(204);
    }
    expect(logQuestion).not.toHaveBeenCalled();
    await POST(req({ question: 'q', intent: 'hire-me-2' }));
    expect(logQuestion).toHaveBeenCalledTimes(1);
  });

  it(`caps logging at ${LOG_CAP} per visitor per day, still 204`, async () => {
    for (let i = 0; i < LOG_CAP + 5; i++) {
      expect((await POST(req({ question: `q${i}`, intent: 'who' }))).status).toBe(204);
    }
    expect(logQuestion).toHaveBeenCalledTimes(LOG_CAP);
    await POST(req({ question: 'other visitor', intent: 'who' }, '5.6.7.8'));
    expect(logQuestion).toHaveBeenCalledTimes(LOG_CAP + 1);
  });

  it("does not use up the visitor's agent quota", async () => {
    await POST(req({ question: 'q', intent: 'who' }));
    const { hashIp } = await import('@/server/store');
    expect(await store.consumeVisitor(hashIp('1.2.3.4', 'test-salt'), 5)).toEqual({
      allowed: true,
      remaining: 4,
    });
  });

  it('skips logging in production without a salt', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IP_HASH_SALT', '');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await POST(req({ question: 'q', intent: 'who' }))).status).toBe(204);
    expect(logQuestion).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('204s when the store throws', async () => {
    failing = true;
    expect((await POST(req({ question: 'q', intent: 'a' }))).status).toBe(204);
  });
});
