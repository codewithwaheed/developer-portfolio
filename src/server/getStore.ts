import 'server-only';
import type { AgentStore } from './store';
import { createMemoryStore } from './memoryStore';
import { createSupabaseStore } from './supabaseStore';

let memory: AgentStore | undefined;
let supabase: AgentStore | undefined;

const memoryStore = () => (memory ??= createMemoryStore());

/**
 * Wrap the Supabase store so a broken database (tables not migrated yet, outage, paused
 * project) degrades to the per-process memory store instead of silencing the agent. Caps
 * still apply per instance. `ping` stays strict so the health check reports the outage.
 */
export function withMemoryFallback(primary: AgentStore, backup: () => AgentStore): AgentStore {
  let warned = false;
  const run = async <T>(op: (s: AgentStore) => Promise<T>): Promise<T> => {
    try {
      return await op(primary);
    } catch (e) {
      if (!warned) {
        warned = true;
        console.error('Agent store: Supabase failed, using the in-memory store.', e);
      }
      return op(backup());
    }
  };
  return {
    consumeVisitor: (h, cap) => run((s) => s.consumeVisitor(h, cap)),
    consumeDaily: (c) => run((s) => s.consumeDaily(c)),
    getCached: (k) => run((s) => s.getCached(k)),
    setCached: (k, v) => run((s) => s.setCached(k, v)),
    logQuestion: (e) => run((s) => s.logQuestion(e)),
    ping: () => primary.ping(),
  };
}

/** Supabase when configured (with a memory fallback), otherwise the memory store (local dev). */
export function getAgentStore(): AgentStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    return (supabase ??= withMemoryFallback(createSupabaseStore(url, key), memoryStore));
  }
  return memoryStore();
}
