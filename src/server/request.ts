import 'server-only';

/** Scripted-intent logs per visitor per 24h on /api/agent/log; beyond it logging is skipped. */
export const LOG_CAP = 30;

/** The visitor's IP as Vercel forwards it; shared by /api/agent and /api/agent/log. */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

let warned = false;

/**
 * The IP-hash salt, or null when production has none (unsalted hashes would be reversible).
 * Callers then skip everything that hashes an IP. Logs the misconfiguration once per process.
 */
export function ipHashSalt(): string | null {
  const salt = process.env.IP_HASH_SALT ?? '';
  if (salt || process.env.NODE_ENV !== 'production') return salt;
  if (!warned) {
    warned = true;
    console.error('IP_HASH_SALT is not set: the agent is disabled until it is configured.');
  }
  return null;
}

/** Test hook: forget that the missing-salt error was logged. */
export function resetSaltWarning(): void {
  warned = false;
}
