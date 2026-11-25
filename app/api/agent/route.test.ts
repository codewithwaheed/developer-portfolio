import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from '@/server/memoryStore';
import type { AgentStore } from '@/server/store';
import { FALLBACK_TEXT } from '@/agent/actions';
import { resetSaltWarning } from '@/server/request';

let store: AgentStore;
const askGemini = vi.fn();
vi.mock('@/server/getStore', () => ({ getAgentStore: () => store }));
vi.mock('@/server/gemini', () => ({
  askGemini: (...a: unknown[]) => askGemini(...a),
  askFit: vi.fn(),
}));
vi.mock('@/content/load', () => ({
  getContent: async () => ({
    about: { html: '', skills: [], photo: '' },
    jobs: [],
    projects: [],
    posts: [],
  }),
}));

import { POST } from './route';

const req = () =>
  new Request('http://x/api/agent', {
    method: 'POST',
    headers: { 'x-forwarded-for': '9.9.9.9' },
    body: JSON.stringify({ question: 'rust vs go?' }),
  });

describe('POST /api/agent', () => {
  beforeEach(() => {
    store = createMemoryStore();
    askGemini.mockReset().mockResolvedValue({ text: 'Rust.', rawToolCalls: [] });
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'test-model');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetSaltWarning();
  });

  it('in production without IP_HASH_SALT: error fallback, no Gemini call, no writes, one error log', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IP_HASH_SALT', '');
    const writes = [
      vi.spyOn(store, 'consumeVisitor'),
      vi.spyOn(store, 'consumeDaily'),
      vi.spyOn(store, 'setCached'),
      vi.spyOn(store, 'logQuestion'),
    ];
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let i = 0; i < 2; i++) {
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        source: 'fallback',
        reason: 'error',
        text: FALLBACK_TEXT,
      });
    }
    expect(askGemini).not.toHaveBeenCalled();
    writes.forEach((w) => expect(w).not.toHaveBeenCalled());
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('in development an empty salt still answers', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('IP_HASH_SALT', '');
    const res = await POST(req());
    expect(await res.json()).toMatchObject({ source: 'gemini', text: 'Rust.' });
  });

  it('with a salt in production it answers', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IP_HASH_SALT', 'a-long-random-salt');
    const res = await POST(req());
    expect(await res.json()).toMatchObject({ source: 'gemini' });
  });
});
