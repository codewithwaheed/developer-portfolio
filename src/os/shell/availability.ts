export type AvailabilityState = 'online' | 'just-off' | 'offline';

export interface WorkHours {
  /** Hour of day (0-23) in the home timezone when work starts. */
  start: number;
  /** Hour of day when work ends; smaller than `start` means it runs past midnight. */
  end: number;
}

export interface Availability {
  state: AvailabilityState;
  label: string;
  /** One line on what happens next, in the home timezone. */
  detail: string;
  /** The next moment the state changes. */
  nextChange: Date;
  /** When the next working period starts (now, if already online, this is the current start). */
  nextStart: Date;
  nextEnd: Date;
}

/** "Just got off work" lasts this long after the shift ends. */
export const JUST_OFF_HOURS = 3;

const DAY = 24 * 60;

function minutesOfDay(tz: string | undefined, now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/** "3:00 PM" in `tz` (the visitor's own zone when `tz` is omitted). */
export function formatTime12(date: Date, tz?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Where Waheed is in his working day right now, judged in his own timezone. */
export function getAvailability(
  now: Date,
  tz: string,
  tzAbbr: string,
  hours: WorkHours,
): Availability {
  const m = minutesOfDay(tz, now);
  const start = hours.start * 60;
  const end = hours.end * 60;
  const active = start <= end ? m >= start && m < end : m >= start || m < end;
  const sinceEnd = (m - end + DAY) % DAY;
  const untilStart = (start - m + DAY) % DAY || DAY;
  const untilEnd = (end - m + DAY) % DAY || DAY;
  const at = (mins: number) => new Date(now.getTime() + mins * 60_000);

  const nextStart = at(untilStart);
  const nextEnd = at(untilEnd);
  if (active) {
    return {
      state: 'online',
      label: 'Online now',
      detail: `Active until ${formatTime12(nextEnd, tz)} ${tzAbbr}`,
      nextChange: nextEnd,
      nextStart: now,
      nextEnd,
    };
  }
  const justOff = sinceEnd < JUST_OFF_HOURS * 60;
  return {
    state: justOff ? 'just-off' : 'offline',
    label: justOff ? 'Just got off work' : 'Offline',
    detail: `Back at ${formatTime12(nextStart, tz)} ${tzAbbr}`,
    nextChange: justOff ? at(JUST_OFF_HOURS * 60 - sinceEnd) : nextStart,
    nextStart,
    nextEnd,
  };
}
