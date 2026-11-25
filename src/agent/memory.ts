import { safeStorage } from '@/lib/safeStorage';
import { APP_IDS, type AppId } from '@/os/apps/registry';

const KEY = 'agentos.memory';

/** Apps the visitor has not opened yet, as a suggestion chip each. */
const CHIP: Partial<Record<AppId, string>> = {
  me: 'Who are you?',
  experience: 'Where have you worked?',
  projects: 'Show me your projects',
  consult: 'Can I book a consult?',
  pensieve: 'Show me your blog',
  resume: 'Show me your resume',
  messages: 'How can I contact you?',
  terminal: 'Open the terminal',
  settings: 'What are your skills?',
};

export const DEFAULT_CHIPS = [
  'Show me your AI work',
  'Where have you worked?',
  'I want to hire you',
  'Who are you?',
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function opened(): AppId[] {
  const v = safeStorage.get<unknown>(KEY, []);
  return Array.isArray(v) ? (v.filter((x) => APP_IDS.includes(x as AppId)) as AppId[]) : [];
}

export const memory = {
  recordOpen(id: AppId): void {
    const seen = opened();
    if (seen.includes(id)) return;
    safeStorage.set(KEY, [...seen, id]);
    emit();
  },
  unseen(): AppId[] {
    const seen = opened();
    return APP_IDS.filter((id) => !seen.includes(id));
  },
  clear(): void {
    safeStorage.set(KEY, []);
    emit();
  },
  /** Up to four prompts for apps not yet opened; the defaults when nothing is left to suggest. */
  suggestions(): string[] {
    const chips = memory
      .unseen()
      .flatMap((id) => (CHIP[id] ? [CHIP[id] as string] : []))
      .slice(0, 4);
    return chips.length ? chips : DEFAULT_CHIPS;
  },
  /** Notified when memory changes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
