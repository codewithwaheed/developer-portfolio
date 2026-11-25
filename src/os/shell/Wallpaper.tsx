import type { CSSProperties } from 'react';

type Blob = {
  color: string;
  size: string;
  left: string;
  top: string;
  drift: string;
  dx: string;
  dy: string;
  delay: string;
};

// Four soft colour fields drifting on long, out-of-phase loops.
const BLOBS: Blob[] = [
  {
    color: 'var(--wall-a)',
    size: '62vmax',
    left: '-14%',
    top: '-22%',
    drift: '52s',
    dx: '9vw',
    dy: '6vh',
    delay: '0s',
  },
  {
    color: 'var(--wall-b)',
    size: '56vmax',
    left: '48%',
    top: '-18%',
    drift: '64s',
    dx: '-8vw',
    dy: '9vh',
    delay: '-18s',
  },
  {
    color: 'var(--wall-c)',
    size: '48vmax',
    left: '30%',
    top: '46%',
    drift: '58s',
    dx: '7vw',
    dy: '-8vh',
    delay: '-30s',
  },
  {
    color: 'var(--wall-d)',
    size: '38vmax',
    left: '-8%',
    top: '52%',
    drift: '72s',
    dx: '10vw',
    dy: '-5vh',
    delay: '-9s',
  },
];

export function Wallpaper({ thinking = false }: { thinking?: boolean }) {
  return (
    <div aria-hidden className="wallpaper" data-thinking={thinking}>
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className="wallpaper-blob"
          style={
            {
              background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)`,
              width: b.size,
              height: b.size,
              left: b.left,
              top: b.top,
              animationDelay: b.delay,
              '--drift': b.drift,
              '--dx': b.dx,
              '--dy': b.dy,
            } as CSSProperties
          }
        />
      ))}
      <div className="wallpaper-shimmer" />
      <div className="wallpaper-veil" />
      <div className="wallpaper-grain" />
    </div>
  );
}
