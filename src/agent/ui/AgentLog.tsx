'use client';

import { useEffect, useRef } from 'react';
import { useAgent, LOG_DIVIDER } from '../agentStore';

/** agent.log: the agent's steps, live. */
export function AgentLog() {
  const log = useAgent((s) => s.log);
  const status = useAgent((s) => s.status);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [log.length, status]);

  return (
    <ol
      aria-label="Agent log"
      className="h-full overflow-auto p-4 font-mono text-[12.5px] leading-[1.7] text-[var(--fg)]"
    >
      {log.length === 0 && status === 'idle' && (
        <li className="text-[var(--fg-faint)]">No agent activity yet. Ask something below.</li>
      )}
      {log.map((line, i) => {
        if (line === LOG_DIVIDER) {
          return (
            <li key={i} aria-hidden className="select-none text-[var(--fg-faint)]">
              {line}
            </li>
          );
        }
        const done = line.startsWith('✓');
        return (
          <li key={i} className="whitespace-pre-wrap break-words">
            {done ? (
              <>
                <span className="text-[var(--ok)]">✓</span>
                {line.slice(1)}
              </>
            ) : (
              line
            )}
          </li>
        );
      })}
      {status !== 'idle' && (
        <li className="text-[var(--think)] motion-safe:animate-pulse">
          … {status === 'thinking' ? 'thinking' : 'working'}
        </li>
      )}
      <li ref={endRef} aria-hidden className="h-px" />
    </ol>
  );
}
