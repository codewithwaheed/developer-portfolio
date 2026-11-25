'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
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
const SHEET_SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 } as const;
const SWIPE_PX = 36;
const SWIPE_VELOCITY = 300;

interface Props {
  onSubmit(question: string): void;
  onTour(): void;
  suggestions?: string[];
  /** 'bar' floats above the dock; 'sheet' is the phone's swipe-up bottom sheet. */
  variant?: 'bar' | 'sheet';
  /** False while boot/lock covers the shell: ⌘K / Ctrl+K is ignored. */
  shortcutEnabled?: boolean;
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
export function AgentBar({
  onSubmit,
  onTour,
  suggestions = DEFAULT_SUGGESTIONS,
  variant = 'bar',
  shortcutEnabled = true,
}: Props) {
  const status = useAgent((s) => s.status);
  const reply = useAgent((s) => s.reply);
  const reduce = useReducedMotion() ?? false;
  const streamed = useStreamed(reply, reduce);
  const [value, setValue] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);

  // The sheet opens itself when the agent has something to say.
  useEffect(() => {
    if (reply) setExpanded(true);
  }, [reply]);

  // ⌘K / Ctrl+K from anywhere (but not from behind the boot/lock screen).
  useEffect(() => {
    if (!shortcutEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutEnabled]);

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

  const replyBubble = (
    <AnimatePresence>
      {reply && (
        <motion.div
          key="reply"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          // Announce once, when the streamed text is complete.
          aria-busy={streamed !== reply}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
          transition={SPRING}
          className="glass glass-strong pointer-events-auto relative w-full max-w-[560px] rounded-2xl py-3 pr-9 pl-4 text-[13.5px] leading-relaxed"
        >
          {/* One copy of the text: the unrevealed tail is laid out but invisible. */}
          <p className="whitespace-pre-wrap">
            {streamed}
            {streamed.length < reply.length && (
              <span aria-hidden className="invisible">
                {reply.slice(streamed.length)}
              </span>
            )}
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
  );

  const chips = (
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
  );

  const inputRow = (
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
  );

  if (variant === 'sheet') {
    return (
      <AgentSheet
        ref={barRef}
        expanded={expanded}
        onExpandedChange={setExpanded}
        details={
          <>
            {replyBubble}
            {chips}
          </>
        }
      >
        {inputRow}
      </AgentSheet>
    );
  }

  return (
    <div
      ref={barRef}
      data-agent-bar
      data-variant="bar"
      className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[1000] flex flex-col items-center gap-2 px-4"
    >
      {replyBubble}
      {chips}
      {inputRow}
    </div>
  );
}

/** Phone bottom sheet: grab handle on top, swipe up or tap to expand, swipe down to collapse. */
function AgentSheet({
  ref,
  expanded,
  onExpandedChange,
  details,
  children,
}: {
  ref: Ref<HTMLDivElement>;
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
  details: ReactNode;
  children: ReactNode;
}) {
  const drag = useDragControls();
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      ref={ref}
      data-agent-bar
      data-variant="sheet"
      data-expanded={expanded}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.25}
      onDragEnd={(_, info) => {
        if (info.offset.y < -SWIPE_PX || info.velocity.y < -SWIPE_VELOCITY) onExpandedChange(true);
        else if (info.offset.y > SWIPE_PX || info.velocity.y > SWIPE_VELOCITY)
          onExpandedChange(false);
      }}
      layout={!reduce}
      transition={SHEET_SPRING}
      className="glass glass-strong fixed inset-x-0 bottom-0 z-[1000] flex flex-col gap-2.5 rounded-t-[26px] rounded-b-none border-b-0 px-3 pb-[calc(12px+env(safe-area-inset-bottom))]"
    >
      <div onPointerDown={(e) => drag.start(e)} className="flex touch-none justify-center pt-1.5">
        <button
          type="button"
          aria-label={expanded ? 'Collapse agent' : 'Expand agent'}
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          className="grid h-6 w-24 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span aria-hidden className="h-[5px] w-10 rounded-full bg-[var(--fg-faint)] opacity-70" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0 } : SHEET_SPRING}
            className="flex max-h-[55vh] flex-col items-center gap-2.5 overflow-y-auto"
          >
            {details}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-center">{children}</div>
    </motion.div>
  );
}
