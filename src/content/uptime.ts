const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseMonth(label: string): number {
  const [mon, year] = label.trim().split(/\s+/);
  const m = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
  if (m < 0 || Number.isNaN(Number(year))) throw new Error(`Invalid date: ${label}`);
  return Number(year) * 12 + m;
}

function splitRange(range: string): [string, string] {
  const [start, end] = range.split(/\s+-\s+/);
  return [start, end ?? 'Present'];
}

export function isCurrent(range: string): boolean {
  return /present/i.test(splitRange(range)[1]);
}

export function formatUptime(range: string, now: Date): string {
  const [start, end] = splitRange(range);
  const endMonths = isCurrent(range) ? now.getFullYear() * 12 + now.getMonth() : parseMonth(end);
  const total = Math.max(0, endMonths - parseMonth(start));
  return `${Math.floor(total / 12)}y ${total % 12}m`;
}
