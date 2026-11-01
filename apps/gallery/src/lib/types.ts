// SPDX-License-Identifier: Apache-2.0
import type { LoadingMode } from './loading-policy';
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

export interface NativePath { encoding: 'windows-utf16le' | 'unix-bytes'; bytes: number[] }

export interface DiscoveryState {
  id: string;
  generation: string;
  kind: 'open' | 'refresh';
  phase: 'opening' | 'scanning' | 'complete' | 'partial' | 'cancelled' | 'failed' | 'unavailable';
  entriesSeen: string;
  mediaSeen: string;
  requestedRoot: string | null;
  requestedNativeRoot: NativePath | null;
  sessionId: string | null;
  message: string | null;
}

export interface Snapshot {
  version: string;
  sequence: string;
  discovery: DiscoveryState | null;
  sessionId: string | null;
  root: string | null;
  nativeRoot: NativePath | null;
  status: 'selection' | DiscoveryState['phase'];
  revision: string;
  mediaOrigin: string;
  metadataRevision: string;
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
  version: string;
  formatVersion: 1;
  pageSize: number;
  cardSize: 'small' | 'medium' | 'large';
  fontScale: 80 | 90 | 100;
  controlsExpanded: boolean;
  scrollIndicator: 'auto' | 'always';
  metadataExpanded: boolean;
  summaryFields: SummaryField[];
  loadingMode: LoadingMode;
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

export type FieldStep = {kind:'key'; key:string; occurrence:number} | {kind:'index'; index:number};
export interface SummaryField { source:string; path:FieldStep[] }
export type JsonNode = {type:'null'} | {type:'boolean';value:boolean} | {type:'string';value:string} | {type:'number';value:string} | {type:'array';items:JsonNode[]} | {type:'object';members:{key:string;value:JsonNode}[]};
export interface MetadataDocument {
  source:string; label:string; basis:string; rank:number; ambiguous:boolean; stale:boolean;
  status:'ready'|'invalid'|'limited'|'encoding'|'unreadable'|'changed'; message:string|null;
  node:JsonNode|null; sourceText:string|null; recordPath:string|null;
}
export interface MetadataResult {sessionId:string;itemId:string;itemRevision:string;metadataRevision:string;documents:MetadataDocument[];limitations:string[]}
