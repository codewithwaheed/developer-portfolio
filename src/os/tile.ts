import { appMeta, type AppId } from './apps/registry';

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN_LEFT = 16;
/** Clears the desktop icons on the right. */
const MARGIN_RIGHT = 120;
const MARGIN_TOP = 40;
/** Clears the prompt bar and dock at the bottom. */
const MARGIN_BOTTOM = 176;
const MIN_W = 400;
const MIN_H = 300;
/** Windows are a touch larger than their cell, so the screen looks full rather than gappy. */
const GROW = 1.12;

const idealCols = (n: number) => (n <= 3 ? n : n === 4 ? 2 : 3);

/**
 * Spread `ids` across the desktop in a grid, side by side, with each window shrunk to fit
 * its cell (never beyond its default size). Returns {} for fewer than two windows.
 */
export function tileLayout(
  ids: AppId[],
  viewport: { w: number; h: number },
): Partial<Record<AppId, Slot>> {
  const n = ids.length;
  if (n < 2) return {};
  const left = MARGIN_LEFT;
  const top = MARGIN_TOP;
  const regionW = Math.max(MIN_W, viewport.w - MARGIN_LEFT - MARGIN_RIGHT);
  const regionH = Math.max(MIN_H, viewport.h - MARGIN_TOP - MARGIN_BOTTOM);
  const cols = Math.min(idealCols(n), Math.max(1, Math.floor(regionW / 360)));
  const rows = Math.ceil(n / cols);
  const cellW = regionW / cols;
  const cellH = regionH / rows;

  const out: Partial<Record<AppId, Slot>> = {};
  ids.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const col = i - row * cols;
    const def = appMeta[id].defaultSize;
    const w = Math.round(Math.min(def.w, Math.max(MIN_W, cellW * GROW)));
    const h = Math.round(Math.min(def.h, Math.max(MIN_H, cellH * GROW)));
    // Spread the windows of a row (and the rows) edge to edge; a lone window is centred.
    const x = inRow > 1 ? left + (col * (regionW - w)) / (inRow - 1) : left + (regionW - w) / 2;
    const y = rows > 1 ? top + (row * (regionH - h)) / (rows - 1) : top + (regionH - h) / 2;
    out[id] = { x: Math.round(x), y: Math.round(y), w, h };
  });
  return out;
}
