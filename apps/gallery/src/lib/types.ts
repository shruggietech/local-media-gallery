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
  stale: boolean;
}

export interface DiscoveryState {
  id: string;
  generation: string;
  kind: 'open' | 'refresh';
  phase: 'opening' | 'scanning' | 'complete' | 'partial' | 'cancelled' | 'failed' | 'unavailable';
  entriesSeen: string;
  mediaSeen: string;
  requestedRoot: string | null;
  message: string | null;
}

export interface Snapshot {
  version: string;
  sequence: string;
  discovery: DiscoveryState | null;
  sessionId: string | null;
  root: string | null;
  status: 'selection' | DiscoveryState['phase'];
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

export interface ViewSettings {
  version: '0.0.0';
  formatVersion: 1;
  pageSize: number;
  cardSize: 'small' | 'medium' | 'large';
  fontScale: 80 | 90 | 100;
  controlsExpanded: boolean;
  scrollIndicator: 'auto' | 'always';
  metadataExpanded: boolean;
  filter: Filter;
  sort: Sort;
  direction: Direction;
}
export interface SettingsEnvelope {
  settings: ViewSettings;
  revision: string;
  warning: string | null;
  testPageSize?: 4;
  sessionId: string | null;
  sources: Record<SettingField, SettingSource>;
  savedTo: Partial<Record<SettingField, SaveDestination>>;
  layers: Record<'user' | 'remembered' | 'portable' | 'session', SettingsPatch>;
  recents: RecentDirectory[];
  destinations: Partial<Record<SaveDestination, string>>;
}
export type SettingField = Exclude<keyof ViewSettings, 'version' | 'formatVersion'>;
export type SettingsPatch = Partial<Pick<ViewSettings, SettingField>>;
export type SaveDestination = 'session' | 'user' | 'remembered' | 'portable';
export type SettingSource = 'default' | SaveDestination;
export interface RecentDirectory { id: string; displayPath: string; lastActivityMs: string }
