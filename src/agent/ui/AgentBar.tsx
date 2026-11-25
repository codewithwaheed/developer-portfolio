'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconSparkles, IconSteeringWheel, IconX } from '@tabler/icons-react';
import { play } from '@/sound/sound';
import { useAgent } from '../agentStore';

export const DEFAULT_SUGGESTIONS = [
  'Show me your AI work',
  'Where have you worked?',
  'I want to hire you',
  'Who are you?',
];

const STREAM_MS = 1200;
const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

interface Props {
  onSubmit(question: string): void;
  onTour(): void;
  suggestions?: string[];
}

/** Reveal `text` character by character over ~1.2s (instantly under reduced motion). */
function useStreamed(text: string, instant: boolean): string {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (instant || !text) {
      setShown(text);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const n = Math.ceil(text.length * Math.min(1, (now - t0) / STREAM_MS));
      setShown(text.slice(0, n));
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    setShown('');
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, instant]);
  return shown;
}

/** Glass prompt bar above the dock. ⌘K / Ctrl+K focuses it. */
export function AgentBar({ onSubmit, onTour, suggestions = DEFAULT_SUGGESTIONS }: Props) {
  const status = useAgent((s) => s.status);
  const reply = useAgent((s) => s.reply);
  const reduce = useReducedMotion() ?? false;
  const streamed = useStreamed(reply, reduce);
  const [value, setValue] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Any visitor input outside the bar interrupts a running plan.
  useEffect(() => {
    if (status !== 'acting') return;
    const interrupt = (e: Event) => {
      if (barRef.current?.contains(e.target as Node)) return;
      useAgent.getState().abort();
    };
    window.addEventListener('pointerdown', interrupt, true);
    window.addEventListener('keydown', interrupt, true);
    return () => {
      window.removeEventListener('pointerdown', interrupt, true);
      window.removeEventListener('keydown', interrupt, true);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'thinking') play('think');
  }, [status]);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setValue('');
    onSubmit(q);
  };

  const busy = status !== 'idle';
  const showChips = value === '' && !busy && suggestions.length > 0;

  return (
    <div
      ref={barRef}
      data-agent-bar
      className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[1000] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {reply && (
          <motion.div
            key="reply"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={SPRING}
            className="glass glass-strong pointer-events-auto relative w-full max-w-[560px] rounded-2xl py-3 pr-9 pl-4 text-[13.5px] leading-relaxed"
          >
            <span className="sr-only">{reply}</span>
            <p aria-hidden className="whitespace-pre-wrap">
              {streamed}
            </p>
            <button
              type="button"
              aria-label="Dismiss reply"
              onClick={() => useAgent.getState().setReply('')}
              className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-md text-[var(--fg-muted)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            >
              <IconX size={12} stroke={2.2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChips && (
          <motion.ul
            key="chips"
            aria-label="Suggestions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
            transition={SPRING}
            className="pointer-events-auto flex max-w-[640px] flex-wrap justify-center gap-1.5"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => submit(s)}
                  className="glass h-7 rounded-full px-3 text-[12.5px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--fg)]"
                >
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="glass pointer-events-auto flex h-12 w-full max-w-[560px] items-center gap-2 rounded-2xl pr-1.5 pl-3.5 focus-within:shadow-[var(--glass-shadow-focus),0_0_0_3px_var(--accent-soft)]">
        <IconSparkles
          aria-hidden
          size={17}
          stroke={1.8}
          className={`shrink-0 ${busy ? 'text-[var(--think)] motion-safe:animate-pulse' : 'text-[var(--accent)]'}`}
        />
        <input
          ref={inputRef}
          type="text"
          aria-label="Ask AgentOS"
          placeholder="Ask AgentOS anything…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit(value);
            } else if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--fg-faint)]"
        />
        <kbd className="hidden shrink-0 rounded-md bg-[var(--control)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--fg-muted)] sm:block">
          ⌘K
        </kbd>
        <button
          type="button"
          aria-label="Let the agent drive"
          onClick={onTour}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-[12.5px] font-medium text-white shadow-[0_4px_14px_rgba(110,75,255,0.35)] transition-[filter] hover:brightness-110"
        >
          <IconSteeringWheel aria-hidden size={15} stroke={1.9} />
          <span className="hidden sm:inline">Let the agent drive</span>
          <span className="sm:hidden">Drive</span>
        </button>
      </div>
    </div>
  );
}
