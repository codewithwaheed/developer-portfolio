import 'server-only';
import { WINDOW_MS, type AgentStore, type CachedAnswer } from './store';

const pacificDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);

/** In-memory store mirroring the SQL semantics (tests, local dev). */
export function createMemoryStore(now: () => Date = () => new Date()): AgentStore {
  const visitors = new Map<string, { count: number; start: number }>();
  const daily = new Map<string, number>();
  const cache = new Map<string, { value: CachedAnswer; at: number }>();

  return {
    async consumeVisitor(ipHash, cap) {
      const t = now().getTime();
      let row = visitors.get(ipHash);
      if (!row || row.start < t - WINDOW_MS) {
        row = { count: 0, start: t };
        visitors.set(ipHash, row);
      }
      if (row.count >= cap) return { allowed: false, remaining: 0 };
      row.count += 1;
      return { allowed: true, remaining: cap - row.count };
    },
    async consumeDaily(ceiling) {
      const day = pacificDay(now());
      const count = daily.get(day) ?? 0;
      if (count >= ceiling) return false;
      daily.set(day, count + 1);
      return true;
    },
    async getCached(key) {
      const row = cache.get(key);
      if (!row || row.at < now().getTime() - WINDOW_MS) return null;
      return row.value;
    },
    async setCached(key, value) {
      cache.set(key, { value, at: now().getTime() });
    },
    async logQuestion() {},
    async ping() {},
  };
}
