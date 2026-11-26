'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react';
import { IconMinus, IconX } from '@tabler/icons-react';
import { useOS } from '../store';
import { play } from '@/sound/sound';
import { appMeta, type AppId } from '../apps/registry';
import { AppGlyph } from '../apps/icons';

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;
const SETTLE = { type: 'spring', stiffness: 300, damping: 30 } as const;
const Z_BASE = 10;

export function Window({ id, children }: { id: AppId; children: ReactNode }) {
  const live = useOS((s) => s.windows.find((w) => w.id === id));
  // Keep the last known state so AnimatePresence can play the exit animation
  // after the window has left the store.
  const last = useRef(live);
  if (live) last.current = live;
  const win = live ?? last.current;
  const closing = !live;
  const focused = useOS((s) => s.focused === id);
  const viewport = useOS((s) => s.viewport);
  const { focusApp, closeApp, minimizeApp, moveWindow } = useOS.getState();

  const reduce = useReducedMotion();
  const drag = useDragControls();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(win?.x ?? 0);
  const y = useMotionValue(win?.y ?? 0);

  const meta = appMeta[id];
  const width = win?.w ?? meta.defaultSize.w;
  const height = win?.h ?? meta.defaultSize.h;

  // Follow store position (agent moves, viewport re-clamps, post-drag clamp).
  const wx = win?.x;
  const wy = win?.y;
  useEffect(() => {
    if (wx === undefined || wy === undefined) return;
    const t = reduce ? { duration: 0 } : SETTLE;
    const ax = animate(x, wx, t);
    const ay = animate(y, wy, t);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [wx, wy, reduce, x, y]);

  useEffect(() => {
    play(closing ? 'close' : 'open');
  }, [closing]);

  // Move keyboard focus into the window when it becomes the focused one,
  // unless the visitor is typing in the agent bar (the agent opened it).
  useEffect(() => {
    if (!focused || win?.minimized) return;
    if (document.activeElement?.closest('[data-agent-bar]')) return;
    ref.current?.focus({ preventScroll: true });
  }, [focused, win?.minimized]);

  if (!win) return null;

  const onDragEnd = () => {
    moveWindow(id, x.get(), y.get());
    const next = useOS.getState().windows.find((w) => w.id === id);
    if (next) {
      animate(x, next.x, SETTLE);
      animate(y, next.y, SETTLE);
    }
  };

  // Genie target: shrink towards the dock at the bottom centre.
  const toDock = {
    x: viewport.w / 2 - (win.x + width / 2),
    y: viewport.h - 36 - (win.y + height / 2),
  };

  return (
    <motion.div
      drag
      dragControls={drag}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      style={{
        x,
        y,
        zIndex: Z_BASE + win.z,
        width,
        height,
        // A minimised or closing window must not block clicks underneath.
        pointerEvents: win.minimized || closing ? 'none' : undefined,
      }}
      className="absolute top-0 left-0"
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-label={meta.title}
        aria-hidden={win.minimized || closing || undefined}
        inert={win.minimized || closing}
        tabIndex={-1}
        data-window={id}
        data-focused={focused}
        onPointerDown={() => focusApp(id)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeApp(id);
          }
        }}
        initial={reduce ? false : { opacity: 0, scale: 0.94, y: 14 }}
        animate={
          win.minimized
            ? { opacity: 0, scale: 0.16, x: toDock.x, y: toDock.y }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
        transition={reduce ? { duration: 0 } : SPRING}
        className="glass flex h-full w-full flex-col overflow-hidden rounded-[18px] outline-none"
        style={{
          pointerEvents: win.minimized || closing ? 'none' : 'auto',
          boxShadow: focused ? 'var(--glass-shadow-focus)' : undefined,
        }}
      >
        <header
          onPointerDown={(e) => drag.start(e)}
          className="flex h-11 shrink-0 cursor-grab touch-none items-center gap-2.5 pr-2.5 pl-3.5 select-none active:cursor-grabbing"
        >
          <AppGlyph id={id} className="size-[18px]" />
          <h2
            className={`flex-1 truncate text-[13px] font-medium tracking-[-0.005em] transition-colors ${
              focused ? 'text-[var(--fg)]' : 'text-[var(--fg-faint)]'
            }`}
          >
            {meta.title}
          </h2>
          <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label={`Minimize ${meta.title}`}
              className="win-control"
              data-kind="minimize"
              onClick={() => {
                play('click');
                minimizeApp(id);
              }}
            >
              <IconMinus size={13} stroke={2.2} />
            </button>
            <button
              type="button"
              aria-label={`Close ${meta.title}`}
              className="win-control"
              data-kind="close"
              onClick={() => closeApp(id)}
            >
              <IconX size={13} stroke={2.2} />
            </button>
          </div>
        </header>
        <div className="mx-1.5 mb-1.5 min-h-0 flex-1 overflow-auto rounded-[13px] bg-[var(--surface)]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
