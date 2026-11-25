'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  animate,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from 'motion/react';
import { play } from '@/sound/sound';
import { useAgent } from '../agentStore';

const GLIDE = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const FIND_FRAMES = 20; // ~330ms for a freshly opened window to render its target

interface CursorImpl {
  moveTo(selector: string): Promise<void>;
  click(): Promise<void>;
}

let impl: CursorImpl | null = null;

/** Imperative handle used by the executor. Safe to call when no cursor is mounted. */
export const cursor: CursorImpl = {
  moveTo: (selector) => impl?.moveTo(selector) ?? Promise.resolve(),
  click: () => impl?.click() ?? Promise.resolve(),
};

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** First matching element that is actually laid out (dock and desktop share selectors). */
async function findTarget(selector: string): Promise<Element | null> {
  for (let i = 0; i < FIND_FRAMES; i++) {
    let els: Element[] = [];
    try {
      els = Array.from(document.querySelectorAll(selector));
    } catch {
      return null;
    }
    const hit = els.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (hit) return hit;
    await nextFrame();
  }
  return null;
}

/** The agent's violet pointer. Glides between targets on springs; hidden while idle. */
export function GhostCursor() {
  const acting = useAgent((s) => s.status === 'acting');
  const plan = useAgent((s) => s.controller);
  const reduce = useReducedMotion() ?? false;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const press = useAnimationControls();
  const ripple = useAnimationControls();
  // The plan (controller) the cursor was last placed for. Each plan starts hidden and
  // enters from the prompt bar on its first target, so it never shows at a stale spot.
  const placedFor = useRef<AbortController | undefined>(undefined);
  const [shownFor, setShownFor] = useState<AbortController | undefined>(undefined);
  const visible = acting && !reduce && plan !== undefined && shownFor === plan;

  useEffect(() => {
    impl = {
      async moveTo(selector) {
        const el = await findTarget(selector);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const tx = r.left + r.width / 2;
        const ty = r.top + r.height / 2;
        const current = useAgent.getState().controller;
        if (placedFor.current !== current) {
          // Enter from the prompt bar, bottom centre.
          x.jump(window.innerWidth / 2);
          y.jump(window.innerHeight - 120);
          placedFor.current = current;
          setShownFor(current);
        }
        if (prefersReducedMotion()) {
          x.jump(tx);
          y.jump(ty);
          return;
        }
        await Promise.all([animate(x, tx, GLIDE), animate(y, ty, GLIDE)]);
      },
      async click() {
        play('click');
        await Promise.all([
          press.start({ scale: [1, 0.8, 1], transition: { duration: 0.22, ease: 'easeOut' } }),
          ripple.start({
            scale: [0.4, 2.2],
            opacity: [0.55, 0],
            transition: { duration: 0.45, ease: 'easeOut' },
          }),
        ]);
      },
    };
    return () => {
      impl = null;
    };
  }, [x, y, press, ripple]);

  return (
    <Pointer visible={visible} x={x} y={y}>
      <motion.span
        aria-hidden
        animate={ripple}
        initial={{ opacity: 0 }}
        className="absolute -top-4 -left-4 size-8 rounded-full border-2 border-[var(--accent)]"
      />
      <motion.svg
        animate={press}
        width="26"
        height="26"
        viewBox="0 0 26 26"
        className="relative origin-top-left drop-shadow-[0_4px_14px_rgba(110,75,255,0.55)]"
      >
        <defs>
          <linearGradient id="ghost-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b9a6ff" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        {/* A soft kite: tip at the origin, notched tail. */}
        <path
          d="M1.5 1.5 L23 10.2 L13.6 13.6 L10.2 23 Z"
          fill="url(#ghost-fill)"
          stroke="white"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </motion.svg>
      <span className="glass glass-strong absolute top-6 left-5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[var(--accent)]">
        agent
      </span>
    </Pointer>
  );
}

// Always mounted so the press/ripple controls exist before the first click.
function Pointer({
  visible,
  x,
  y,
  children,
}: {
  visible: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <motion.div
      aria-hidden
      data-ghost-cursor
      data-visible={visible}
      style={{ x, y }}
      initial={false}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="pointer-events-none fixed top-0 left-0 z-[1500] origin-top-left"
    >
      {children}
    </motion.div>
  );
}
