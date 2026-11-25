'use client';

import { useEffect, useRef, useState } from 'react';
import type { PortfolioContent } from '@/content/types';
import { useOS } from '../store';
import { runCommand } from './terminal';

const PROMPT = 'waheed@agentos ~ %';

interface Line {
  prompt?: string;
  text: string;
}

export function TerminalApp({ content }: { content: PortfolioContent }) {
  const openApp = useOS((s) => s.openApp);
  const [lines, setLines] = useState<Line[]>([{ text: "Type 'help' to see available commands." }]);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lines]);

  function submit() {
    const input = value;
    const result = runCommand(input, { openApp, content });
    setLines((prev) => [
      ...(result.clear ? [] : prev),
      ...(result.clear ? [] : [{ prompt: PROMPT, text: input }]),
      ...result.output.map((text) => ({ text })),
    ]);
    if (input.trim()) setHistory((h) => [...h, input]);
    setValue('');
    setCursor(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setValue(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cursor === null) return;
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setValue('');
      } else {
        setCursor(next);
        setValue(history[next]);
      }
    }
  }

  return (
    <div
      className="h-full overflow-auto bg-[#0b0b14]/90 p-4 font-mono text-[13px] leading-relaxed text-[#e6e4ff]"
      style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-words">
          {l.prompt && <span className="text-[#8ea2ff]">{l.prompt} </span>}
          {l.text}
        </div>
      ))}
      <div className="flex gap-2">
        <span className="text-[#8ea2ff]">{PROMPT}</span>
        <input
          ref={inputRef}
          aria-label="terminal input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          className="min-w-0 flex-1 bg-transparent text-[#e6e4ff] caret-[#8ea2ff] outline-none"
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}
