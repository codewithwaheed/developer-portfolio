// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ping = vi.fn();
let failing = false;
vi.mock('@/server/getStore', () => ({
  getAgentStore: () => ({
    ping: () => (failing ? Promise.reject(new Error('db down')) : ping()),
  }),
}));

import { GET } from './route';

const req = (auth?: string) =>
  new Request('http://x/api/health', {
    headers: auth === undefined ? {} : { authorization: auth },
  });

describe('GET /api/health', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    ping.mockReset();
    ping.mockResolvedValue(undefined);
    failing = false;
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('401s without an Authorization header', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    expect(ping).not.toHaveBeenCalled();
  });

  it('401s with a wrong bearer token', async () => {
    const res = await GET(req('Bearer nope'));
    expect(res.status).toBe(401);
    expect(ping).not.toHaveBeenCalled();
  });

  it('401s when CRON_SECRET is unset, even for an empty bearer', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req('Bearer '));
    expect(res.status).toBe(401);
    expect(ping).not.toHaveBeenCalled();
  });

  it('200s and pings the store with the right bearer', async () => {
    const res = await GET(req('Bearer test-secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('503s when the ping rejects, without leaking the error', async () => {
    failing = true;
    const res = await GET(req('Bearer test-secret'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ ok: false });
    expect(JSON.stringify(body)).not.toContain('db down');
  });
});
