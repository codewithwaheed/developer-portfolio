const formatters = new Map<string, Intl.DateTimeFormat>();

/** 24-hour `HH:MM` wall-clock time for `now` in the IANA zone `tz`. */
export function formatClock(tz: string, now: Date): string {
  let fmt = formatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(tz, fmt);
  }
  return fmt.format(now);
}
