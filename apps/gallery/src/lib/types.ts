// SPDX-License-Identifier: Apache-2.0
export interface MediaItem {
  id: string;
  revision: string;
  name: string;
  relativePath: string;
  kind: 'image' | 'video';
  mime: string;
  size: string | null;
  modifiedMs: string | null;
  issue: string | null;
}

export interface Snapshot {
  version: string;
  sessionId: string | null;
  root: string | null;
  status: 'selection' | 'scanning' | 'complete' | 'partial' | 'unavailable';
  revision: string;
  mediaOrigin: string;
  items: MediaItem[];
  issues: string[];
}

export type Filter = 'all' | 'image' | 'video';
export type Sort = 'name' | 'modified' | 'size';
export type Direction = 'asc' | 'desc';

export interface MediaFacts {
  width?: number;
  height?: number;
  duration?: number;
  error?: string;
}
