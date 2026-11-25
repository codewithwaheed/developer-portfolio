'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { IconSparkles, IconSteeringWheel } from '@tabler/icons-react';
import { play } from '@/sound/sound';
import { useAgent } from '../agentStore';
import { ChatPanel } from './ChatPanel';

export const DEFAULT_SUGGESTIONS = [
  'Show me your AI work',
  'Where have you worked?',
  'I want to hire you',
  'Who are you?',
];

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
  /** Project id -> title, for the fit report's project buttons. */
  projectTitles?: Record<string, string>;
}

/** Glass prompt bar above the dock. ⌘K / Ctrl+K focuses it. */
export function AgentBar({
  onSubmit,
  onTour,
  suggestions = DEFAULT_SUGGESTIONS,
  variant = 'bar',
  shortcutEnabled = true,
  projectTitles = {},
}: Props) {
  const status = useAgent((s) => s.status);
  const messageCount = useAgent((s) => s.messages.length);
  const [value, setValue] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  // The chat (and the phone sheet) open themselves whenever the conversation grows.
  useEffect(() => {
    if (messageCount > 0) {
      setChatOpen(true);
      setExpanded(true);
    }
  }, [messageCount]);

  // Grow the prompt with its content (pasted job descriptions), up to a few lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

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
      {chatOpen && (
        <ChatPanel
          key="chat"
          compact={variant === 'sheet'}
          projectTitles={projectTitles}
          onClose={variant === 'bar' ? () => setChatOpen(false) : undefined}
        />
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
    <div className="glass pointer-events-auto flex min-h-12 w-full max-w-[560px] items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-3.5 focus-within:shadow-[var(--glass-shadow-focus),0_0_0_3px_var(--accent-soft)]">
      <IconSparkles
        aria-hidden
        size={17}
        stroke={1.8}
        className={`shrink-0 ${busy ? 'text-[var(--think)] motion-safe:animate-pulse' : 'text-[var(--accent)]'}`}
      />
      <textarea
        ref={inputRef}
        rows={1}
        aria-label="Ask AgentOS"
        placeholder="Ask anything, or paste a job description…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setChatOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(value);
          } else if (e.key === 'Escape') {
            e.currentTarget.blur();
          }
        }}
        className="max-h-[120px] min-w-0 flex-1 resize-none self-center bg-transparent py-1 text-[14px] leading-5 outline-none placeholder:text-[var(--fg-faint)]"
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
