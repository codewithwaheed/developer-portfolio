const formatters = new Map<string, Intl.DateTimeFormat>();

/** 24-hour `HH:MM` wall-clock time for `now` in the IANA zone `tz` (the visitor's own zone when omitted). */
export function formatClock(tz: string | undefined, now: Date): string {
  const key = tz ?? '';
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(key, fmt);
  }
  return fmt.format(now);
}

/** The visitor's own IANA timezone, e.g. "America/New_York"; null where it cannot be known. */
export function visitorTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** "America/Argentina/Buenos_Aires" -> "Buenos Aires"; "UTC" stays "UTC". */
export function tzCity(tz: string): string {
  const last = tz.split('/').at(-1) ?? tz;
  return last.replace(/_/g, ' ');
}
