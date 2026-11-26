import { describe, expect, it } from 'vitest';
import { getAvailability } from './availability';

const hours = { start: 15, end: 5 };
// Karachi is UTC+5 with no daylight saving, so 10:00Z is 15:00 PKT.
const at = (iso: string) => getAvailability(new Date(iso), 'Asia/Karachi', 'PKT', hours);

describe('getAvailability', () => {
  it('is online from 3pm and across midnight', () => {
    expect(at('2026-11-25T10:00:00Z').state).toBe('online'); // 15:00
    expect(at('2026-11-25T19:30:00Z').state).toBe('online'); // 00:30
    expect(at('2026-11-25T23:59:00Z').state).toBe('online'); // 04:59
  });

  it('is just off work for the first hours after 5am', () => {
    const a = at('2026-11-26T00:00:00Z'); // 05:00
    expect(a.state).toBe('just-off');
    expect(a.label).toBe('Just got off work');
    expect(at('2026-11-26T02:59:00Z').state).toBe('just-off'); // 07:59
  });

  it('is offline until 3pm, and says when he is back', () => {
    const a = at('2026-11-26T03:00:00Z'); // 08:00
    expect(a.state).toBe('offline');
    expect(a.detail).toBe('Back at 3:00 PM PKT');
    expect(at('2026-11-26T09:59:00Z').state).toBe('offline'); // 14:59
  });

  it('reports the next change', () => {
    const online = at('2026-11-25T10:00:00Z');
    expect(online.nextChange.toISOString()).toBe('2026-11-26T00:00:00.000Z');
    expect(online.detail).toBe('Active until 5:00 AM PKT');
  });
});
