import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memory } from './memory';

beforeEach(() => {
  window.localStorage.clear();
});

describe('memory', () => {
  it('forgets nothing it has seen until cleared', () => {
    expect(memory.unseen()).toContain('me');
    memory.recordOpen('me');
    expect(memory.unseen()).not.toContain('me');
    memory.clear();
    expect(memory.unseen()).toContain('me');
  });

  it('suggests prompts for unseen apps, up to four', () => {
    expect(memory.suggestions()).toHaveLength(4);
    memory.recordOpen('me');
    expect(memory.suggestions()).not.toContain('Who are you?');
  });

  it('falls back to the defaults once everything has been opened', () => {
    [
      'me',
      'experience',
      'projects',
      'consult',
      'pensieve',
      'messages',
      'resume',
      'terminal',
      'settings',
    ].forEach((id) => memory.recordOpen(id as never));
    expect(memory.suggestions()).toContain('Show me your AI work');
  });

  it('notifies subscribers only on change', () => {
    const fn = vi.fn();
    const off = memory.subscribe(fn);
    memory.recordOpen('me');
    memory.recordOpen('me');
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    memory.clear();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
