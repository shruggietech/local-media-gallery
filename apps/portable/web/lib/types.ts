// SPDX-License-Identifier: Apache-2.0
export type ViewMode = "grid" | "tiled" | "list";
export type SortKey = "name" | "date" | "size" | "type" | "path";
export type KindFilter = "all" | "image" | "video" | "favorites";

export interface Config {
  view: ViewMode;
  gridSize: number;
  tileColumns: number;
  listSize: number;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  kind: KindFilter;
  theme: "system" | "light" | "dark";
  showNames: boolean;
  fit: "cover" | "contain";
}

export interface ScanStatus {
  phase: "closed" | "discover" | "ready" | "error";
  found: number;
  error?: string;
}

export interface MediaFacts {
  w: number;
  h: number;
  dur: number;
}

export interface MediaRecord {
  id: string;
  path: string;
  kind: 0 | 1;
  size: number;
  mtime: number;
  revision: string;
  fav: boolean;
}

export interface Asset extends MediaRecord, MediaFacts {
  generation: string;
  name: string;
  dir: string;
  ext: string;
}

export interface Snapshot {
  generation: string;
  root: string;
  config: Config;
  scan: ScanStatus;
  assets?: MediaRecord[];
}
