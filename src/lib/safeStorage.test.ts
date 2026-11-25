import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from './safeStorage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('safeStorage', () => {
  it('round-trips JSON values', () => {
    safeStorage.set('agentos.theme', { mode: 'dark' });
    expect(safeStorage.get('agentos.theme', null)).toEqual({ mode: 'dark' });
  });

  it('returns the fallback when the key is missing', () => {
    expect(safeStorage.get('agentos.booted', false)).toBe(false);
  });

  it('returns the fallback when stored JSON is corrupt', () => {
    localStorage.setItem('agentos.memory', '{not json');
    expect(safeStorage.get('agentos.memory', [])).toEqual([]);
  });

  it('returns the fallback when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(safeStorage.get('agentos.muted', true)).toBe(true);
  });

  it('does not throw when writing fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => safeStorage.set('agentos.muted', false)).not.toThrow();
  });
});
