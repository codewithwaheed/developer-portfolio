'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import {
  IconArrowUp,
  IconPlayerStopFilled,
  IconSparkles,
  IconSteeringWheel,
} from '@tabler/icons-react';
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
/** Distance from the screen bottom to the prompt bar: clears the dock and its hover pop. */
const BAR_BOTTOM = 104;
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
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  // The chat floats like a window: above the apps while the visitor is using it, beneath
  // them once they click anywhere else, so it never traps the desktop.
  const chatRef = useRef<HTMLDivElement>(null);
  const [raised, setRaised] = useState(true);
  const [barHeight, setBarHeight] = useState(56);

  // The chat (and the phone sheet) open themselves whenever the conversation grows.
  useEffect(() => {
    if (messageCount > 0) {
      setChatOpen(true);
      setMinimized(false);
      setExpanded(true);
      setRaised(true);
    }
  }, [messageCount]);

  // Desktop layering: a press inside the chat or prompt raises the chat; a press anywhere
  // else (a window, the dock, the desktop) sends it behind the windows.
  useEffect(() => {
    if (variant !== 'bar') return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      setRaised(Boolean(chatRef.current?.contains(t) || barRef.current?.contains(t)));
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [variant]);

  // The chat sits directly above the prompt, however tall the prompt and chips grow.
  useEffect(() => {
    const el = barRef.current;
    if (variant !== 'bar' || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight));
    ro.observe(el);
    setBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [variant]);

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
      const t = e.target as Node;
      if (barRef.current?.contains(t) || chatRef.current?.contains(t)) return;
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
          minimized={variant === 'bar' && minimized}
          onMinimize={variant === 'bar' ? () => setMinimized(true) : undefined}
          onRestore={() => setMinimized(false)}
          maximized={maximized}
          onToggleMaximize={variant === 'bar' ? () => setMaximized((m) => !m) : undefined}
          maxHeight={`calc(100vh - ${BAR_BOTTOM + barHeight + 8 + 44}px)`}
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
    <div className="glass pointer-events-auto flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-3.5 focus-within:shadow-[var(--glass-shadow-focus),0_0_0_3px_var(--accent-soft)]">
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
        className="focus-bare max-h-[120px] min-w-0 flex-1 resize-none self-center bg-transparent py-1 text-[14px] leading-5 outline-none placeholder:text-[var(--fg-faint)]"
      />
      <kbd className="hidden shrink-0 rounded-md bg-[var(--control)] px-1.5 py-0.5 font-sans text-[11px] text-[var(--fg-muted)] sm:block">
        ⌘K
      </kbd>
      <button
        type="button"
        aria-label="Send message"
        disabled={!value.trim()}
        onClick={() => submit(value)}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_4px_14px_rgba(110,75,255,0.35)] transition-[filter,opacity] hover:brightness-110 disabled:opacity-35 disabled:shadow-none"
      >
        <IconArrowUp aria-hidden size={17} stroke={2.4} />
      </button>
    </div>
  );

  // Not part of the chat box: a different action (a hands-free tour, no typing), so it looks
  // different and says what it does. While the agent is driving it becomes a Stop button.
  const driving = status === 'acting';
  const driveButton = (
    <button
      type="button"
      aria-label={driving ? 'Stop the agent' : 'Let the agent drive'}
      title={driving ? 'Stop the tour' : 'Watch the agent open each app and walk you through them'}
      onClick={driving ? () => useAgent.getState().abort() : onTour}
      className="glass pointer-events-auto flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-[var(--accent)] px-3.5 text-[12.5px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
    >
      {driving ? (
        <IconPlayerStopFilled aria-hidden size={14} />
      ) : (
        <IconSteeringWheel aria-hidden size={16} stroke={1.9} />
      )}
      <span className="hidden sm:inline">{driving ? 'Stop' : 'Auto-tour'}</span>
      <span className="sm:hidden">{driving ? 'Stop' : 'Tour'}</span>
    </button>
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
        <div className="flex w-full max-w-[640px] items-stretch gap-2">
          {inputRow}
          {driveButton}
        </div>
      </AgentSheet>
    );
  }

  return (
    <>
      <div
        ref={chatRef}
        data-agent-chat
        style={{ bottom: BAR_BOTTOM + barHeight + 8, zIndex: raised ? 1000 : 5 }}
        className="pointer-events-none fixed inset-x-0 flex justify-center px-4"
      >
        {replyBubble}
      </div>
      <div
        ref={barRef}
        data-agent-bar
        data-variant="bar"
        className="pointer-events-none fixed inset-x-0 bottom-[104px] z-[1000] flex flex-col items-center gap-2 px-4"
      >
        {chips}
        <div className="flex w-full max-w-[680px] items-stretch gap-2">
          {inputRow}
          {driveButton}
        </div>
      </div>
    </>
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
