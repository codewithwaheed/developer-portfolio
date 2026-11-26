'use client';

import { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { play } from '@/sound/sound';
import { useOS } from '../store';
import { APP_IDS, appMeta, type AppId } from '../apps/registry';
import { AppGlyph } from '../apps/icons';

const BASE = 48;
const PEAK = 80;
const REACH = 140;

const DOCK_APPS = APP_IDS.filter((id) => appMeta[id].inDock);

export function Dock() {
  const mouseX = useMotionValue(Infinity);
  const windows = useOS((s) => s.windows);
  const open = new Set(windows.map((w) => w.id));
  // Apps that live on the desktop show up in the dock while they are open.
  const extras = windows.map((w) => w.id).filter((id) => !appMeta[id].inDock);

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[1010] flex justify-center"
    >
      <motion.ul
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass pointer-events-auto flex h-[66px] items-end gap-2 rounded-[22px] px-2.5 pb-[9px]"
      >
        {DOCK_APPS.map((id) => (
          <DockItem key={id} id={id} mouseX={mouseX} running={open.has(id)} />
        ))}
        {extras.length > 0 && (
          <li
            aria-hidden
            className="mx-1 mb-1 h-10 w-px self-end bg-[var(--fg-faint)] opacity-50"
          />
        )}
        {extras.map((id) => (
          <DockItem key={id} id={id} mouseX={mouseX} running />
        ))}
      </motion.ul>
    </nav>
  );
}

function DockItem({
  id,
  mouseX,
  running,
}: {
  id: AppId;
  mouseX: MotionValue<number>;
  running: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  const distance = useTransform(mouseX, (mx) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? mx - (r.left + r.width / 2) : Infinity;
  });
  const target = useTransform(distance, [-REACH, 0, REACH], [BASE, reduce ? BASE : PEAK, BASE]);
  const size = useSpring(target, { mass: 0.1, stiffness: 280, damping: 19 });
  const [hovered, setHovered] = useState(false);
  const [launching, setLaunching] = useState(false);

  const onClick = () => {
    play('dock');
    const s = useOS.getState();
    const win = s.windows.find((w) => w.id === id);
    if (win && !win.minimized && s.focused === id) s.minimizeApp(id);
    else {
      // A hop while the app launches, like a real dock.
      if (!win && !reduce) {
        setLaunching(true);
        setTimeout(() => setLaunching(false), 700);
      }
      s.openApp(id);
    }
  };

  return (
    <li
      className="relative flex flex-col items-center"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            className="glass glass-strong pointer-events-none absolute rounded-lg px-2.5 py-1 text-[12px] font-medium whitespace-nowrap"
            style={{ top: -46 }}
          >
            {appMeta[id].title}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.button
        ref={ref}
        type="button"
        data-app-icon={id}
        aria-label={appMeta[id].title}
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        animate={{ y: launching ? [0, -22, 0, -12, 0, -4, 0] : 0 }}
        transition={launching ? { duration: 0.7, ease: 'easeOut' } : undefined}
        style={{ width: size, height: size }}
        className="relative grid place-items-center rounded-[28%] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <AppGlyph id={id} className="size-full" />
      </motion.button>
      <span
        aria-hidden
        className={`absolute -bottom-[7px] size-1 rounded-full bg-[var(--fg)] transition-[opacity,transform] duration-300 ${
          running ? 'scale-100 opacity-70' : 'scale-0 opacity-0'
        }`}
      />
    </li>
  );
}
