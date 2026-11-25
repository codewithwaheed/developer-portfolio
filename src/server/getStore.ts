import 'server-only';
import type { AgentStore } from './store';
import { createMemoryStore } from './memoryStore';
import { createSupabaseStore } from './supabaseStore';

let memory: AgentStore | undefined;
let supabase: AgentStore | undefined;

/** Supabase when configured, otherwise a process-wide in-memory store (local dev). */
export function getAgentStore(): AgentStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return (supabase ??= createSupabaseStore(url, key));
  return (memory ??= createMemoryStore());
}
