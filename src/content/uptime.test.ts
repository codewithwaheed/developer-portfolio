import { describe, expect, it } from 'vitest';
import { formatUptime, isCurrent } from './uptime';

const now = new Date('2026-11-25');

describe('formatUptime', () => {
  it('measures an open-ended range up to now', () => {
    expect(formatUptime('Jan 2023 - Present', now)).toBe('3y 10m');
  });
  it('measures a closed range', () => {
    expect(formatUptime('Jan 2022 - Jan 2023', now)).toBe('1y 0m');
    expect(formatUptime('Apr 2019 - Dec 2021', now)).toBe('2y 8m');
  });
});

describe('isCurrent', () => {
  it('is true only for Present ranges', () => {
    expect(isCurrent('Jan 2023 - Present')).toBe(true);
    expect(isCurrent('Jan 2022 - Jan 2023')).toBe(false);
  });
});
