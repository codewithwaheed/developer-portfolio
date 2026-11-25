import { describe, expect, it } from 'vitest';
import { formatClock } from './clock';

describe('formatClock', () => {
  it('formats a 24h HH:MM time in the given zone', () => {
    expect(formatClock('Asia/Karachi', new Date('2026-11-25T09:02:00Z'))).toBe('14:02');
  });

  it('pads midnight hours as 00', () => {
    expect(formatClock('UTC', new Date('2026-11-25T00:05:00Z'))).toBe('00:05');
  });
});
