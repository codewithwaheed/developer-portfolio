import { describe, expect, it } from 'vitest';
import { tileLayout } from './tile';

const vp = { w: 1280, h: 800 };

describe('tileLayout', () => {
  it('does nothing for a single window', () => {
    expect(tileLayout(['me'], vp)).toEqual({});
  });

  it('puts four windows in a 2x2 grid that stays on screen and spreads across it', () => {
    const slots = tileLayout(['me', 'experience', 'projects', 'consult'], vp);
    const all = Object.values(slots);
    expect(all).toHaveLength(4);
    for (const s of all) {
      expect(s!.x).toBeGreaterThanOrEqual(0);
      expect(s!.x + s!.w).toBeLessThanOrEqual(vp.w);
      expect(s!.y).toBeGreaterThanOrEqual(28);
    }
    // Two columns, two rows: side by side first, then below.
    expect(slots.me!.x).toBeLessThan(slots.experience!.x);
    expect(slots.projects!.x).toBeLessThan(slots.consult!.x);
    expect(slots.projects!.y).toBeGreaterThan(slots.me!.y);
    expect(slots.me!.y).toBe(slots.experience!.y);
  });

  it('shrinks windows to their cell but never past their default size', () => {
    const slots = tileLayout(['me', 'experience', 'projects'], vp);
    expect(slots.me!.w).toBeLessThanOrEqual(560);
  });
});
