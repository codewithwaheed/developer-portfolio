import { describe, expect, it } from 'vitest';
import { initialPhase } from './bootFlow';

describe('initialPhase', () => {
  it('boots on a first visit', () => {
    expect(initialPhase({ booted: false, reducedMotion: false, deepLink: false })).toBe('boot');
  });
  it('goes straight to lock once booted', () => {
    expect(initialPhase({ booted: true, reducedMotion: false, deepLink: false })).toBe('lock');
  });
  it('skips boot under reduced motion', () => {
    expect(initialPhase({ booted: false, reducedMotion: true, deepLink: false })).toBe('lock');
  });
  it('opens the desktop on a deep link', () => {
    expect(initialPhase({ booted: false, reducedMotion: false, deepLink: true })).toBe('desktop');
  });
});
