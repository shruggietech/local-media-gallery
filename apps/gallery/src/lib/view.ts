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
