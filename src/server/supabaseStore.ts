import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { WINDOW_MS, type AgentStore, type CachedAnswer } from './store';

/** `client` is injectable for tests. */
export function createSupabaseStore(
  url: string,
  serviceKey: string,
  client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
): AgentStore {
  return {
    async consumeVisitor(ipHash, cap) {
      const { data, error } = await client.rpc('consume_visitor', { p_hash: ipHash, p_cap: cap });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { allowed: Boolean(row?.allowed), remaining: Number(row?.remaining ?? 0) };
    },
    async consumeDaily(ceiling) {
      const { data, error } = await client.rpc('consume_daily', { p_ceiling: ceiling });
      if (error) throw error;
      return data === true;
    },
    async getCached(key) {
      try {
        const { data, error } = await client
          .from('answer_cache')
          .select('response, created_at')
          .eq('key', key)
          .maybeSingle();
        if (error || !data) return null;
        if (new Date(data.created_at).getTime() < Date.now() - WINDOW_MS) return null;
        return data.response as CachedAnswer;
      } catch {
        return null;
      }
    },
    async setCached(key, value) {
      const { error } = await client
        .from('answer_cache')
        .upsert({ key, response: value, created_at: new Date().toISOString() });
      if (error) throw error;
    },
    async logQuestion(entry) {
      const { error } = await client.from('question_log').insert(entry);
      if (error) throw error;
    },
    async ping() {
      const { error } = await client.from('answer_cache').select('key').limit(1);
      if (error) throw error;
    },
  };
}
