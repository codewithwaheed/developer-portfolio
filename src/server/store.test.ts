// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeQuestion, hashIp } from './store';
import { createMemoryStore } from './memoryStore';
import { createSupabaseStore } from './supabaseStore';

const DAY = 24 * 3600e3;
const ans = { text: 'hi', actions: [] };

function clock() {
  let t = Date.UTC(2026, 0, 1, 12, 0, 0);
  return { now: () => new Date(t), advance: (ms: number) => void (t += ms) };
}

describe('helpers', () => {
  it('normalizes questions', () => {
    expect(normalizeQuestion('  What  is Zorx?? ')).toBe('what is zorx');
  });
  it('hashes ips with salt', () => {
    expect(hashIp('1.2.3.4', 's')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('1.2.3.4', 's')).not.toBe(hashIp('1.2.3.4', 't'));
  });
});

describe('memory store', () => {
  it('caps visitors and resets after 24h', async () => {
    const c = clock();
    const s = createMemoryStore(c.now);
    for (let i = 0; i < 5; i++) expect((await s.consumeVisitor('h', 5)).allowed).toBe(true);
    expect(await s.consumeVisitor('h', 5)).toEqual({ allowed: false, remaining: 0 });
    c.advance(DAY + 1);
    expect((await s.consumeVisitor('h', 5)).allowed).toBe(true);
  });
  it('expires cache after 24h', async () => {
    const c = clock();
    const s = createMemoryStore(c.now);
    await s.setCached('k', ans);
    expect(await s.getCached('k')).toEqual(ans);
    c.advance(DAY + 1);
    expect(await s.getCached('k')).toBeNull();
  });
  it('enforces the daily ceiling per Pacific day', async () => {
    const c = clock();
    const s = createMemoryStore(c.now);
    expect(await s.consumeDaily(1)).toBe(true);
    expect(await s.consumeDaily(1)).toBe(false);
    c.advance(DAY);
    expect(await s.consumeDaily(1)).toBe(true);
  });
  it('logs and pings', async () => {
    const s = createMemoryStore();
    await s.logQuestion({ question: 'q', intent: null, source: 'scripted' });
    await expect(s.ping()).resolves.toBeUndefined();
  });
});

describe('supabase store', () => {
  function fake(opts: { rpc?: unknown; row?: unknown; error?: unknown }) {
    const calls: { rpc: unknown[][] } = { rpc: [] };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: opts.row ?? null, error: opts.error ?? null }),
      then: (r: (v: unknown) => unknown) => r({ data: [], error: opts.error ?? null }),
    };
    const client = {
      rpc: async (...a: unknown[]) => {
        calls.rpc.push(a);
        return { data: opts.rpc, error: opts.error ?? null };
      },
      from: () => chain,
    } as unknown as SupabaseClient;
    return { client, calls };
  }

  it('calls consume_visitor and maps the row', async () => {
    const { client, calls } = fake({ rpc: [{ allowed: true, remaining: 3 }] });
    const s = createSupabaseStore('u', 'k', client);
    expect(await s.consumeVisitor('h', 5)).toEqual({ allowed: true, remaining: 3 });
    expect(calls.rpc[0]).toEqual(['consume_visitor', { p_hash: 'h', p_cap: 5 }]);
  });
  it('treats stale cache rows as misses', async () => {
    const old = new Date(Date.now() - DAY - 1000).toISOString();
    const { client } = fake({ row: { response: ans, created_at: old } });
    expect(await createSupabaseStore('u', 'k', client).getCached('k')).toBeNull();
    const fresh = new Date().toISOString();
    const f = fake({ row: { response: ans, created_at: fresh } });
    expect(await createSupabaseStore('u', 'k', f.client).getCached('k')).toEqual(ans);
  });
  it('returns null on cache errors but throws on rpc errors', async () => {
    const { client } = fake({ error: { message: 'boom' } });
    const s = createSupabaseStore('u', 'k', client);
    expect(await s.getCached('k')).toBeNull();
    await expect(s.consumeDaily(10)).rejects.toBeTruthy();
  });
});
