// SPDX-License-Identifier: Apache-2.0
import type { Direction, Filter, MediaItem, Snapshot, Sort } from './types.ts';

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function naturalCompare(a: string, b: string): number {
  const left = a.toLowerCase().match(/\d+|\D+/gu) ?? [];
  const right = b.toLowerCase().match(/\d+|\D+/gu) ?? [];
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const x = left[i]; const y = right[i];
    const order = /^\d+$/.test(x) && /^\d+$/.test(y)
      ? (BigInt(x) < BigInt(y) ? -1 : BigInt(x) > BigInt(y) ? 1 : 0)
      : compare(x, y);
    if (order) return order;
  }
  return left.length - right.length || compare(a, b);
}

export function viewItems(items: MediaItem[], filter: Filter, sort: Sort, direction: Direction): MediaItem[] {
  return items.filter(item => filter === 'all' || item.kind === filter).sort((a, b) => {
    let order: number;
    if (sort === 'name') order = naturalCompare(a.name, b.name);
    else {
      const x = sort === 'size' ? a.size : a.modifiedMs;
      const y = sort === 'size' ? b.size : b.modifiedMs;
      if (x === null || y === null) return x === y ? naturalCompare(a.name, b.name) : x === null ? 1 : -1;
      const left = BigInt(x); const right = BigInt(y);
      order = left < right ? -1 : left > right ? 1 : 0;
    }
    return (order && direction === 'desc' ? -order : order) || naturalCompare(a.name, b.name) || compare(a.id, b.id);
  });
}

export function reconcileSelection(selected: string | null, items: MediaItem[]): string | null {
  return selected !== null && items.some(item => item.id === selected) ? selected : null;
}
export function mediaUrl(snapshot: Pick<Snapshot, 'sessionId' | 'mediaOrigin'>, item: MediaItem): string {
  if (!snapshot.sessionId || !snapshot.mediaOrigin) return '';
  return `${snapshot.mediaOrigin}/media/${[snapshot.sessionId, item.id, item.revision].map(encodeURIComponent).join('/')}`;
}
export function formatBytes(value: string | null): string {
  return value === null ? 'Unavailable' : `${BigInt(value).toLocaleString('en-US')} bytes`;
}
export function formatModified(value: string | null): string {
  if (value === null) return 'Unavailable';
  const integer = BigInt(value);
  if (integer < -8640000000000000n || integer > 8640000000000000n) return `${value} ms since Unix epoch`;
  return new Date(Number(integer)).toLocaleString(undefined, { timeZoneName: 'short' });
}

export function pageItems<T>(items: T[], requested: number, size: number): { items: T[]; page: number; pages: number; start: number; end: number } {
  const count = Math.max(1, Math.trunc(size) || 1);
  const pages = Math.max(1, Math.ceil(items.length / count));
  const page = Math.min(pages, Math.max(1, Math.trunc(requested) || 1));
  const offset = (page - 1) * count;
  return { items: items.slice(offset, offset + count), page, pages, start: items.length ? offset + 1 : 0, end: Math.min(offset + count, items.length) };
}

export function masonryLayout(width: number, minimum: number, heights: number[], gap = 12) {
  const available = Math.max(0, width);
  const columns = Math.max(1, Math.floor((available + gap) / (Math.max(1, minimum) + gap)));
  const cardWidth = Math.max(0, (available - gap * (columns - 1)) / columns);
  const offsets = Array<number>(columns).fill(0);
  const positions = heights.map(height => {
    const column = offsets.indexOf(Math.min(...offsets));
    const position = { x: column * (cardWidth + gap), y: offsets[column], column };
    offsets[column] += Math.max(0, height) + gap;
    return position;
  });
  return { columns, width: cardWidth, positions, height: Math.max(0, ...offsets) - (heights.length ? gap : 0) };
}
