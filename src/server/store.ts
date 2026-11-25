import 'server-only';
import { createHash } from 'node:crypto';
import type { AgentAction } from '@/agent/actions';

export type CachedAnswer = { text: string; actions: AgentAction[] };

export interface AgentStore {
  consumeVisitor(ipHash: string, cap: number): Promise<{ allowed: boolean; remaining: number }>;
  consumeDaily(ceiling: number): Promise<boolean>;
  getCached(key: string): Promise<CachedAnswer | null>;
  setCached(key: string, value: CachedAnswer): Promise<void>;
  logQuestion(entry: {
    question: string;
    intent: string | null;
    source: 'scripted' | 'gemini' | 'cache' | 'fallback';
  }): Promise<void>;
  ping(): Promise<void>;
}

export const WINDOW_MS = 24 * 3600e3;

export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.]+$/, '')
    .trim();
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256')
    .update(salt + ':' + ip)
    .digest('hex');
}
