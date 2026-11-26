'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCircleCheck,
  IconFolder,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useOS } from '@/os/store';
import type { FitReport } from '../actions';
import { useAgent, type ChatMessage } from '../agentStore';
import { Markdown } from './Markdown';

const STREAM_CPS = 90; // characters per second for the newest reply
const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;

/** Reveal `text` progressively (instantly under reduced motion or when not `live`). */
function useStreamed(text: string, live: boolean): string {
  const [shown, setShown] = useState(live ? '' : text);
  useEffect(() => {
    if (!live) {
      setShown(text);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const ms = Math.min(2500, (text.length / STREAM_CPS) * 1000);
    const tick = (now: number) => {
      const n = Math.ceil(text.length * Math.min(1, (now - t0) / Math.max(ms, 1)));
      setShown(text.slice(0, n));
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, live]);
  return shown;
}

export { Markdown };

const VERDICT: Record<FitReport['verdict'], { label: string; cls: string }> = {
  strong: {
    label: 'Strong fit',
    cls: 'bg-[color-mix(in_srgb,var(--ok)_22%,transparent)] text-[var(--fg)]',
  },
  good: { label: 'Good fit', cls: 'bg-[var(--accent-soft)] text-[var(--fg)]' },
  partial: {
    label: 'Partial fit',
    cls: 'bg-[color-mix(in_srgb,var(--think)_22%,transparent)] text-[var(--fg)]',
  },
};

/** The job-description fit report, under the agent's summary. */
export function FitCard({
  fit,
  projectTitles,
}: {
  fit: FitReport;
  projectTitles: Record<string, string>;
}) {
  const openProject = (id: string) => {
    const os = useOS.getState();
    os.openApp('projects');
    os.openProject(id);
  };
  return (
    <div className="mt-2.5 space-y-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--hover)] p-3 text-[12.5px]">
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${VERDICT[fit.verdict].cls}`}
      >
        {VERDICT[fit.verdict].label}
      </span>
      {fit.matches.length > 0 && (
        <section aria-label="Matching requirements">
          <h4 className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
            Where he matches
          </h4>
          <ul className="space-y-1">
            {fit.matches.map((m, i) => (
              <li key={i} className="flex gap-1.5">
                <IconCircleCheck
                  aria-hidden
                  size={14}
                  className="mt-[3px] shrink-0 text-[var(--ok)]"
                />
                <span>
                  <strong className="font-semibold text-[var(--fg)]">{m.requirement}</strong>{' '}
                  <span className="text-[var(--fg-muted)]">— {m.evidence}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {fit.gaps.length > 0 && (
        <section aria-label="Gaps">
          <h4 className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
            Worth a conversation
          </h4>
          <ul className="space-y-1">
            {fit.gaps.map((g, i) => (
              <li key={i} className="flex gap-1.5">
                <IconAlertTriangle
                  aria-hidden
                  size={14}
                  className="mt-[3px] shrink-0 text-[var(--think)]"
                />
                <span>
                  <strong className="font-semibold text-[var(--fg)]">{g.requirement}</strong>{' '}
                  <span className="text-[var(--fg-muted)]">— {g.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {fit.projectIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => openProject(id)}
            className="glass flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] hover:bg-[var(--accent-soft)]"
          >
            <IconFolder aria-hidden size={13} />
            {projectTitles[id] ?? id}
          </button>
        ))}
        <button
          type="button"
          onClick={() => useOS.getState().openApp('consult')}
          className="flex h-7 items-center gap-1 rounded-full bg-[var(--accent)] px-3 text-[12px] font-medium text-white hover:brightness-110"
        >
          <IconCalendarEvent aria-hidden size={13} />
          Book a call
        </button>
      </div>
    </div>
  );
}

function Bubble({
  m,
  live,
  projectTitles,
}: {
  m: ChatMessage;
  live: boolean;
  projectTitles: Record<string, string>;
}) {
  const reduce = useReducedMotion() ?? false;
  const shown = useStreamed(m.text, live && !reduce);
  const done = shown.length >= m.text.length;
  if (m.role === 'user') {
    const long = m.text.length > 280;
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3 py-2 text-[13px] whitespace-pre-wrap text-white">
          {long
            ? `${m.text.slice(0, 260)}… (${m.text.length.toLocaleString()} characters)`
            : m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[var(--hover)] px-3 py-2 text-[13.5px] leading-relaxed">
        <Markdown text={shown} />
        {m.fit && done && <FitCard fit={m.fit} projectTitles={projectTitles} />}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start" aria-label="Agent is thinking">
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-[var(--hover)] px-3 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-[var(--fg-muted)] motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** The conversation thread above the prompt bar (or inside the phone sheet). */
export function ChatPanel({
  onClose,
  projectTitles,
  compact = false,
}: {
  onClose?: () => void;
  projectTitles: Record<string, string>;
  compact?: boolean;
}) {
  const messages = useAgent((s) => s.messages);
  const status = useAgent((s) => s.status);
  const scroller = useRef<HTMLDivElement>(null);
  // Only the newest agent message streams; earlier ones render in full.
  const lastAgent = [...messages].reverse().find((m) => m.role === 'agent');
  const liveId = lastAgent?.id;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  if (messages.length === 0 && status !== 'thinking') return null;
  const latest = messages.at(-1);

  return (
    <motion.section
      aria-label="Conversation with the agent"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
      transition={SPRING}
      className={`glass glass-strong pointer-events-auto flex w-full max-w-[560px] flex-col rounded-2xl ${compact ? '' : 'max-h-[min(52vh,520px)]'}`}
    >
      <header className="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[11.5px] text-[var(--fg-muted)]">
        <span className="font-medium">AgentOS</span>
        <span className="flex gap-0.5">
          <button
            type="button"
            aria-label="Clear conversation"
            onClick={() => useAgent.getState().clearChat()}
            className="grid size-6 place-items-center rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          >
            <IconTrash size={13} stroke={2} />
          </button>
          {onClose && (
            <button
              type="button"
              aria-label="Hide conversation"
              onClick={onClose}
              className="grid size-6 place-items-center rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            >
              <IconX size={13} stroke={2.2} />
            </button>
          )}
        </span>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} live={m.id === liveId} projectTitles={projectTitles} />
        ))}
        {status === 'thinking' && latest?.role === 'user' && <Typing />}
      </div>
      {/* Screen readers hear the newest reply once, in full. */}
      <p role="status" aria-live="polite" className="sr-only">
        {lastAgent?.text ?? ''}
      </p>
    </motion.section>
  );
}
