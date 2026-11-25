'use client';

import { useEffect, useRef, useState } from 'react';
import { safeStorage } from '@/lib/safeStorage';

const LINES = ['loading weights: waheed-1…', 'mounting projects/…', 'agent ready'];
const TOTAL = LINES.join('').length;
const CHAR_MS = 3000 / TOTAL;

export function Boot({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const intervalRef = useRef(0);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      safeStorage.set('agentos.booted', true);
      onDone();
    };
    const id = window.setInterval(() => setCount((c) => c + 1), CHAR_MS);
    intervalRef.current = id;
    const end = window.setTimeout(finish, 3000 + 400);
    // Attached a tick late so the click that started a Restart cannot skip it.
    const arm = window.setTimeout(() => {
      window.addEventListener('keydown', finish);
      window.addEventListener('pointerdown', finish);
    }, 0);
    return () => {
      done = true;
      window.clearInterval(id);
      window.clearTimeout(end);
      window.clearTimeout(arm);
      window.removeEventListener('keydown', finish);
      window.removeEventListener('pointerdown', finish);
    };
  }, [onDone]);

  useEffect(() => {
    if (count >= TOTAL) window.clearInterval(intervalRef.current);
  }, [count]);

  let remaining = count;
  return (
    <div
      role="status"
      aria-label="Booting"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black font-mono text-[14px] text-emerald-300"
    >
      <div className="w-[min(90vw,420px)] space-y-1.5">
        {LINES.map((line) => {
          const shown = line.slice(0, Math.max(0, remaining));
          remaining -= line.length;
          return (
            <div key={line} className="h-5">
              {shown}
            </div>
          );
        })}
      </div>
    </div>
  );
}
