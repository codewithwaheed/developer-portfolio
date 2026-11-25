export type Phase = 'boot' | 'lock' | 'desktop';

/** Decides which layer the visitor starts on. Pure so it is trivially testable. */
export function initialPhase(opts: {
  booted: boolean;
  reducedMotion: boolean;
  deepLink: boolean;
}): Phase {
  if (opts.deepLink) return 'desktop';
  if (opts.booted || opts.reducedMotion) return 'lock';
  return 'boot';
}
