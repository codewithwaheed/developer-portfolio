import { beforeEach, describe, expect, it, vi } from 'vitest';

const logQuestion = vi.fn();
let failing = false;
vi.mock('@/server/getStore', () => ({
  getAgentStore: () => ({
    logQuestion: (e: unknown) => (failing ? Promise.reject(new Error('db')) : logQuestion(e)),
  }),
}));

import { POST } from './route';

const req = (body: unknown) =>
  new Request('http://x/api/agent/log', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/agent/log', () => {
  beforeEach(() => {
    logQuestion.mockReset();
    failing = false;
  });

  it('logs a scripted question', async () => {
    logQuestion.mockResolvedValue(undefined);
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

  it('204s when the store throws', async () => {
    failing = true;
    expect((await POST(req({ question: 'q', intent: 'a' }))).status).toBe(204);
  });
});
