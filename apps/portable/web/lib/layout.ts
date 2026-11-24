// SPDX-License-Identifier: Apache-2.0
import type { Asset, Config } from "./types";

export interface Layout {
  height: number;
  count: number;
  /** x, y, w, h of the item box (media area, excluding any label) */
  x: Float32Array;
  y: Float32Array;
  w: Float32Array;
  h: Float32Array;
  /** indices of items intersecting [top, bottom] */
  query(top: number, bottom: number): number[];
}

const GAP = 8;
export const LABEL_H = 26;
export const LIST_ROW_PAD = 8;

function alloc(n: number) {
  return { x: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n), h: new Float32Array(n) };
}

function rangeQuery(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
}

export function aspect(a: Asset): number {
  if (a.w > 0 && a.h > 0) return Math.min(4, Math.max(0.25, a.w / a.h));
  return a.kind === 1 ? 16 / 9 : 1;
}

/** Uniform square cells; the column count follows the container width. */
export function gridLayout(items: Asset[], width: number, cfg: Config): Layout {
  const n = items.length;
  const pad = GAP;
  const inner = Math.max(120, width - pad * 2);
  const cols = Math.max(1, Math.floor((inner + GAP) / (cfg.gridSize + GAP)));
  const cell = (inner - GAP * (cols - 1)) / cols;
  const rowH = cell + GAP + (cfg.showNames ? LABEL_H : 0);
  const b = alloc(n);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    b.x[i] = pad + c * (cell + GAP);
    b.y[i] = pad + r * rowH;
    b.w[i] = cell;
    b.h[i] = cell;
  }
  const rows = Math.ceil(n / cols);
  return {
    height: pad * 2 + rows * rowH,
    count: n,
    ...b,
    query(top, bottom) {
      const r0 = Math.max(0, Math.floor((top - pad) / rowH));
      const r1 = Math.floor((bottom - pad) / rowH);
      return rangeQuery(r0 * cols, Math.min(n, (r1 + 1) * cols));
    },
  };
}

/** Masonry: fixed/auto column count, each tile keeps its aspect ratio. */
export function tiledLayout(items: Asset[], width: number, cfg: Config): Layout {
  const n = items.length;
  const pad = GAP;
  const inner = Math.max(120, width - pad * 2);
  const cols = cfg.tileColumns > 0 ? cfg.tileColumns : Math.max(2, Math.round(inner / 260));
  const colW = (inner - GAP * (cols - 1)) / cols;
  const b = alloc(n);
  const heights = new Float64Array(cols).fill(pad);
  const perCol: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < n; i++) {
    let c = 0;
    for (let k = 1; k < cols; k++) if (heights[k] < heights[c] - 0.5) c = k;
    const h = colW / aspect(items[i]);
    b.x[i] = pad + c * (colW + GAP);
    b.y[i] = heights[c];
    b.w[i] = colW;
    b.h[i] = h;
    heights[c] += h + GAP + (cfg.showNames ? LABEL_H : 0);
    perCol[c].push(i);
  }
  const height = Math.max(...heights) + pad - GAP;
  const lab = cfg.showNames ? LABEL_H : 0;
  return {
    height,
    count: n,
    ...b,
    query(top, bottom) {
      const out: number[] = [];
      for (const col of perCol) {
        // first item whose bottom edge is below `top`
        let lo = 0;
        let hi = col.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          const i = col[mid];
          if (b.y[i] + b.h[i] + lab < top) lo = mid + 1;
          else hi = mid;
        }
        for (let k = lo; k < col.length; k++) {
          const i = col[k];
          if (b.y[i] > bottom) break;
          out.push(i);
        }
      }
      return out;
    },
  };
}

export function listLayout(items: Asset[], width: number, cfg: Config): Layout {
  const n = items.length;
  const rowH = cfg.listSize + LIST_ROW_PAD * 2;
  const b = alloc(n);
  for (let i = 0; i < n; i++) {
    b.x[i] = 0;
    b.y[i] = i * rowH;
    b.w[i] = width;
    b.h[i] = rowH;
  }
  return {
    height: n * rowH,
    count: n,
    ...b,
    query(top, bottom) {
      const r0 = Math.max(0, Math.floor(top / rowH));
      return rangeQuery(r0, Math.min(n, Math.floor(bottom / rowH) + 1));
    },
  };
}

export function buildLayout(items: Asset[], width: number, cfg: Config): Layout {
  switch (cfg.view) {
    case "tiled":
      return tiledLayout(items, width, cfg);
    case "list":
      return listLayout(items, width, cfg);
    default:
      return gridLayout(items, width, cfg);
  }
}
