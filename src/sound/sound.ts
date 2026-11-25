import { safeStorage } from '@/lib/safeStorage';

export type SoundName = 'wake' | 'open' | 'close' | 'click' | 'dock' | 'think' | 'notify';

/** Drop recorded files here later (e.g. open: '/sounds/open.mp3'); they win over synthesis. */
export const SOUND_FILES: Partial<Record<SoundName, string>> = {};

const MUTED_KEY = 'agentos.muted';
const MASTER_GAIN = 0.15;

type Ctx = AudioContext;
type Nodes = { ctx: Ctx; master: GainNode; reverb: ConvolverNode | null };

let nodes: Nodes | null = null;
let muted: boolean | null = null;
const listeners = new Set<() => void>();

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function isMuted(): boolean {
  if (muted === null) muted = safeStorage.get(MUTED_KEY, reducedMotion());
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  safeStorage.set(MUTED_KEY, m);
  listeners.forEach((l) => l());
}

export function subscribeMuted(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function __resetSoundForTests(): void {
  nodes = null;
  muted = null;
  listeners.clear();
}

/** Soft decaying-noise impulse (~1s) for a gentle room tail. */
function makeImpulse(ctx: Ctx): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 1);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

export function unlockAudio(): void {
  try {
    if (nodes || typeof window === 'undefined') return;
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
    let reverb: ConvolverNode | null = null;
    try {
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverb.connect(wet);
      wet.connect(master);
    } catch {
      reverb = null;
    }
    nodes = { ctx, master, reverb };
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    nodes = null;
  }
}

interface Note {
  /** Frequency in Hz. */
  f: number;
  /** Start offset in seconds. */
  at: number;
  /** Duration in seconds. */
  dur: number;
  gain?: number;
  type?: 'sine' | 'triangle';
}

const SOUNDS: Record<SoundName, Note[]> = {
  wake: [
    { f: 523.25, at: 0, dur: 0.5 },
    { f: 659.25, at: 0.16, dur: 0.55 },
    { f: 783.99, at: 0.34, dur: 0.85, gain: 0.9 },
  ],
  open: [
    { f: 440, at: 0, dur: 0.18 },
    { f: 660, at: 0.06, dur: 0.22, gain: 0.7 },
  ],
  close: [
    { f: 587.33, at: 0, dur: 0.14 },
    { f: 392, at: 0.07, dur: 0.2, gain: 0.7 },
  ],
  click: [{ f: 880, at: 0, dur: 0.07, gain: 0.6, type: 'triangle' }],
  dock: [{ f: 659.25, at: 0, dur: 0.16, gain: 0.7 }],
  think: [
    { f: 392, at: 0, dur: 0.2, gain: 0.5 },
    { f: 523.25, at: 0.1, dur: 0.24, gain: 0.5 },
  ],
  notify: [
    { f: 783.99, at: 0, dur: 0.2, gain: 0.8 },
    { f: 1046.5, at: 0.11, dur: 0.3, gain: 0.7 },
  ],
};

function playNote({ ctx, master, reverb }: Nodes, n: Note): void {
  const t0 = ctx.currentTime + n.at;
  const peak = n.gain ?? 1;
  const osc = ctx.createOscillator();
  osc.type = n.type ?? 'sine';
  osc.frequency.setValueAtTime(n.f, t0);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  osc.connect(env);
  env.connect(master);
  if (reverb) env.connect(reverb);
  osc.start(t0);
  osc.stop(t0 + n.dur + 0.02);
}

function playFile(src: string): void {
  const a = new Audio(src);
  a.volume = 0.4;
  void a.play().catch(() => {});
}

export function play(name: SoundName): void {
  try {
    if (!nodes || isMuted()) return;
    const file = SOUND_FILES[name];
    if (file) return playFile(file);
    if (nodes.ctx.state === 'suspended') void nodes.ctx.resume();
    for (const n of SOUNDS[name]) playNote(nodes, n);
  } catch {
    // audio must never break the UI
  }
}
