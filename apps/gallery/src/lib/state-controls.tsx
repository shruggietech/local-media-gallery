// SPDX-License-Identifier: Apache-2.0
'use client';
import { Button, Field, FormControls } from '@brand/web/react/server';
import type { SaveDestination, SettingField, SettingsEnvelope } from './types';

const names: Record<SaveDestination | 'default', string> = { default: 'App default', session: 'Temporary', user: 'User defaults', remembered: 'Remember this folder', portable: 'Portable gallery' };
export function SaveDestinationControl({ value, change, root, ready, viewer = false }: { value: SaveDestination; change: (value: SaveDestination) => void; root: boolean; ready: boolean; viewer?: boolean }) {
  return <div className="save-destination" data-save-destination={value}><Field id={viewer ? 'viewer-save-destination' : 'save-destination'} label="Save changes to" layout="inline" control={<FormControls.Select value={value} disabled={!ready} onChange={event => change(event.target.value as SaveDestination)}><option value="user">User defaults</option><option value="session">Temporary session</option><option value="remembered" disabled={!root}>Remember this folder</option><option value="portable" disabled={!root}>Portable gallery</option></FormControls.Select>} /></div>;
}
function activityDate(value: string) { const date = new Date(Number(value)); return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : value + ' ms since epoch'; }
const labels: Record<SettingField, string> = { pageSize: 'Items per page', cardSize: 'Card size', fontScale: 'Global font size', controlsExpanded: 'Collection controls', scrollIndicator: 'Scroll indicator', metadataExpanded: 'Item information', summaryFields: 'Metadata summary fields', loadingMode: 'Loading strategy', filter: 'Media type', sort: 'Sort by', direction: 'Direction' };
export function StateControls({ envelope, remove, clear, forget, reopen, busy }: { envelope: SettingsEnvelope | null; remove: (field: SettingField, target: 'remembered' | 'portable') => void; clear: () => void; forget: (id: string | null) => void; reopen: (id: string) => void; busy: boolean }) {
  if (!envelope) return null;
  return <details className="state-controls"><summary>Settings sources and recent folders</summary>
    <p className="muted">Changes apply immediately. Temporary choices take precedence until removed or this folder closes. Portable writes create settings.json and a coordination file only after an explicit change.</p>
    <Button variant="ghost" onClick={clear} disabled={busy || Object.keys(envelope.layers.session).length === 0}>Clear temporary choices</Button>
    <dl className="setting-sources">{(Object.keys(labels) as SettingField[]).map(field => <div key={field} data-setting-source={field}><dt>{labels[field]}</dt><dd>{names[envelope.sources[field]]}{envelope.savedTo[field] ? ', also saved to ' + names[envelope.savedTo[field]!] : envelope.sources[field] === 'session' ? ', unsaved' : ''}{(['remembered', 'portable'] as const).map(target => Object.hasOwn(envelope.layers[target], field) ? <Button key={target} variant="ghost" disabled={busy} onClick={() => remove(field, target)}>{'Inherit ' + labels[field] + ' from below ' + names[target]}</Button> : null)}</dd></div>)}</dl>
    <h3>Recent folders</h3><p className="muted">Machine-local history expires after 90 days without a successful open or remembered change. Forgetting removes history only.</p>
    {envelope.recents.length ? <ul className="recent-folders">{envelope.recents.map(row => <li key={row.id}><Button variant="ghost" disabled={busy} onClick={() => reopen(row.id)}>{row.displayPath}</Button><span>{activityDate(row.lastActivityMs)}</span><Button variant="ghost" disabled={busy} onClick={() => forget(row.id)}>{'Forget ' + row.displayPath}</Button></li>)}</ul> : <p>No recent folders.</p>}
    <Button variant="ghost" disabled={busy || !envelope.recents.length} onClick={() => forget(null)}>Clear directory history</Button>
  </details>;
}
