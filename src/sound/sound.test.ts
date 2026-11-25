import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from '@/lib/safeStorage';
import {
  __resetSoundForTests,
  isMuted,
  play,
  setMuted,
  subscribeMuted,
  unlockAudio,
} from './sound';

const createOscillator = vi.fn();
const resume = vi.fn(() => Promise.resolve());

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = {};
  resume = resume;
  createOscillator = createOscillator.mockImplementation(() => ({
    type: 'sine',
    frequency: param(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({ gain: param(), connect: vi.fn() }));
  createConvolver = vi.fn(() => ({ buffer: null, connect: vi.fn() }));
  createBuffer = vi.fn((ch: number, len: number) => ({
    getChannelData: () => new Float32Array(len),
    numberOfChannels: ch,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  createOscillator.mockClear();
  (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  __resetSoundForTests();
});

describe('sound', () => {
  it('is silent until unlocked, plays after, and silent when muted', () => {
    play('open');
    expect(createOscillator).not.toHaveBeenCalled();
    unlockAudio();
    play('open');
    expect(createOscillator).toHaveBeenCalled();
    setMuted(true);
    createOscillator.mockClear();
    play('open');
    expect(createOscillator).not.toHaveBeenCalled();
    expect(safeStorage.get('agentos.muted', false)).toBe(true);
  });

  it('plays every defined sound without throwing', () => {
    unlockAudio();
    for (const n of ['wake', 'open', 'close', 'click', 'dock', 'think', 'notify'] as const) {
      expect(() => play(n)).not.toThrow();
    }
  });

  it('is a safe no-op without an AudioContext', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    __resetSoundForTests();
    expect(() => {
      unlockAudio();
      play('open');
    }).not.toThrow();
  });

  it('defaults to muted under reduced motion and notifies subscribers', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    __resetSoundForTests();
    expect(isMuted()).toBe(true);
    const cb = vi.fn();
    const off = subscribeMuted(cb);
    setMuted(false);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(isMuted()).toBe(false);
    off();
    setMuted(true);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
