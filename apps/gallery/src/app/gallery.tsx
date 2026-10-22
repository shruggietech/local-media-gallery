// SPDX-License-Identifier: Apache-2.0
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { AppFrame, Button, EmptyState, Field, FormControls, StatusBadge } from '@brand/web/react/server';
import { AppFrameEnvironmentBridge } from '@brand/web/react/environment';
import { FolderOpen, Image as ImageIcon, Video, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Direction, Filter, MediaFacts, MediaItem, Snapshot, Sort } from '../lib/types';
import { formatBytes, formatModified, mediaUrl, viewItems } from '../lib/view';

const initial: Snapshot = { version: '0.0.0', sessionId: null, root: null, status: 'selection', revision: '0', mediaOrigin: '', items: [], issues: [] };
const keyOf = (item: MediaItem) => `${item.id}/${item.revision}`;
const errorText = (error: unknown) => typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error);

function MediaCard({ snapshot, item, facts, updateFacts, open }: { snapshot: Snapshot; item: MediaItem; facts: MediaFacts; updateFacts: (key: string, facts: MediaFacts) => void; open: (id: string) => void }) {
  const container = useRef<HTMLElement>(null);
  const [admitted, setAdmitted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const key = keyOf(item);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(entries => setAdmitted(entries.some(entry => entry.isIntersecting)), { root: document.querySelector('.bb-app-frame__scroll'), rootMargin: '100% 0%' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = video.current;
    return () => { if (element) { element.pause(); element.removeAttribute('src'); element.load(); } };
  }, [key, admitted]);
  const source = mediaUrl(snapshot, item);
  const ratio = facts.width && facts.height ? facts.width / facts.height : 1;
  return <article className="media-card" ref={container} data-name={item.name} data-item-id={item.id}>
    <button className="media-open" onClick={() => open(item.id)} aria-label={`Open ${item.name}`}>
      <span className="media-surface" style={{ aspectRatio: ratio }}>
      {item.kind === 'image' && admitted && source && !facts.error
        ? <img src={source} alt={item.name} crossOrigin="anonymous" decoding="async"
          onLoad={event => updateFacts(key, { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => updateFacts(key, { error: 'This image is unavailable or unsupported in the current runtime.' })} />
        : <span className="media-placeholder">{item.kind === 'video' ? <Video aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}<span>{facts.error ? 'Media unavailable' : item.kind === 'video' ? 'Video' : 'Image'}</span></span>}
      </span>
      <span className="media-caption"><span title={item.name}>{item.name}</span><StatusBadge status={facts.error || item.issue ? 'warning' : 'neutral'}>{facts.error || item.issue ? 'Unavailable' : item.kind === 'image' ? 'Image' : 'Video'}</StatusBadge></span>
    </button>
    {item.kind === 'video' && admitted && source && facts.duration === undefined && !facts.error ? <video className="metadata-probe" ref={video} src={source} crossOrigin="anonymous" preload="metadata" aria-hidden="true" tabIndex={-1}
      onLoadedMetadata={event => updateFacts(key, { width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, duration: event.currentTarget.duration })}
      onError={() => updateFacts(key, { error: 'This video format or codec is unavailable in the current runtime.' })} /> : null}
  </article>;
}

function Viewer({ snapshot, item, facts, updateFacts, previous, next, close }: { snapshot: Snapshot; item: MediaItem; facts: MediaFacts; updateFacts: (key: string, facts: MediaFacts) => void; previous: (() => void) | null; next: (() => void) | null; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState('');
  const key = keyOf(item);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
      queueMicrotask(() => (opener?.isConnected ? opener : document.getElementById('bb-main'))?.focus());
    };
  }, []);
  useEffect(() => {
    const element = video.current;
    setPlaying(false); setPlayError('');
    return () => { if (element) { element.pause(); element.removeAttribute('src'); element.load(); } };
  }, [key]);
  const play = async () => {
    const element = video.current; if (!element) return;
    try { if (element.paused) await element.play(); else element.pause(); }
    catch (error) { setPlayError(`Playback could not start: ${errorText(error)}`); }
  };
  const source = mediaUrl(snapshot, item);
  return <dialog className="bb-dialog media-viewer" ref={dialog} aria-labelledby="viewer-title" aria-describedby="viewer-description" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="viewer-header"><div><p className="eyebrow">{item.kind === 'image' ? 'Image' : 'Video'}</p><h2 id="viewer-title">{item.name}</h2></div><Button variant="secondary" onClick={close}>Close viewer</Button></header>
    <p id="viewer-description" className="muted">Full media and current file information.</p>
    <div className="viewer-media">
      {item.kind === 'video'
        ? <video key={key} ref={video} src={source} controls crossOrigin="anonymous" preload="metadata" aria-label={`Video ${item.name}`}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onLoadedMetadata={event => updateFacts(key, { width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, duration: event.currentTarget.duration })}
          onError={event => updateFacts(key, { error: event.currentTarget.error?.code === 3 ? 'This video could not be decoded.' : 'This video format or codec is unavailable in the current runtime.' })} />
        : !facts.error ? <img key={key} src={source} alt={item.name} crossOrigin="anonymous"
          onLoad={event => updateFacts(key, { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          onError={() => updateFacts(key, { error: 'This image is unavailable or unsupported in the current runtime.' })} /> : <ImageIcon aria-hidden="true" />}
    </div>
    {facts.error || item.issue || playError ? <p role="status" className="media-error">{facts.error || item.issue || playError}</p> : null}
    <div className="viewer-actions"><Button variant="secondary" disabled={!previous} onClick={() => previous?.()}><ChevronLeft aria-hidden="true" />Previous</Button>{item.kind === 'video' ? <Button onClick={play}>{playing ? 'Pause' : 'Play'}</Button> : null}<Button variant="secondary" disabled={!next} onClick={() => next?.()}>Next<ChevronRight aria-hidden="true" /></Button></div>
    <section aria-labelledby="information-title"><h3 id="information-title">Item information</h3><dl className="item-facts">
      <dt>Filename</dt><dd>{item.name}</dd><dt>Relative location</dt><dd>{item.relativePath}</dd><dt>Media type</dt><dd>{item.kind} ({item.mime}, filename hint)</dd>
      <dt>File size</dt><dd>{formatBytes(item.size)}</dd><dt>Modified</dt><dd>{formatModified(item.modifiedMs)}</dd>
      <dt>Dimensions</dt><dd>{facts.width && facts.height ? `${facts.width} × ${facts.height}` : 'Unavailable'}</dd>
      <dt>Duration</dt><dd>{item.kind !== 'video' ? 'Not applicable' : Number.isFinite(facts.duration) ? `${facts.duration?.toFixed(2)} seconds` : 'Unavailable'}</dd>
    </dl></section>
  </dialog>;
}

export default function Gallery() {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [filter, setFilter] = useState<Filter>('all'); const [sort, setSort] = useState<Sort>('name'); const [direction, setDirection] = useState<Direction>('asc');
  const [selected, setSelected] = useState<string | null>(null);
  const [facts, setFacts] = useState<Record<string, MediaFacts>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const intent = useRef(0);
  const latest = useRef<Snapshot>(initial);
  const activeKeys = useRef(new Set<string>());
  const apply = useCallback((value: Snapshot, ticket = intent.current) => {
    const old = latest.current;
    if (ticket !== intent.current) return;
    if (old.sessionId === value.sessionId && BigInt(value.revision) < BigInt(old.revision)) return;
    if (old.sessionId === value.sessionId && old.revision === value.revision && old.mediaOrigin === value.mediaOrigin && old.status === value.status && JSON.stringify(old.issues) === JSON.stringify(value.issues)) return;
    if (old.sessionId !== value.sessionId) intent.current += 1;
    latest.current = value;
    activeKeys.current = new Set(value.items.map(keyOf));
    setSnapshot(value);
  }, []);
  useEffect(() => {
    setOverlay(document.getElementById('bb-overlay-root'));
    const preference = window.matchMedia('(prefers-color-scheme: light)');
    const theme = () => document.documentElement.classList.toggle('bb-light', preference.matches);
    theme(); preference.addEventListener('change', theme);
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    const poll = async (first = false) => {
      const currentIntent = intent.current;
      try { const value = await invoke<Snapshot>(first ? 'startup' : 'snapshot'); if (alive && currentIntent === intent.current) apply(value, currentIntent); }
      catch (error) { if (alive) setError(`The native gallery is unavailable: ${errorText(error)}`); }
      if (alive) timer = setTimeout(() => void poll(), 500);
    };
    void poll(true);
    return () => { alive = false; clearTimeout(timer); preference.removeEventListener('change', theme); };
  }, [apply]);
  useEffect(() => {
    const keep = new Set(snapshot.items.map(keyOf));
    setFacts(old => Object.fromEntries(Object.entries(old).filter(([key]) => keep.has(key))));
  }, [snapshot.sessionId, snapshot.revision]);
  const updateFacts = useCallback((key: string, value: MediaFacts) => setFacts(old => {
    if (!activeKeys.current.has(key)) return old;
    const merged = { ...old[key], ...value };
    if (JSON.stringify(merged) === JSON.stringify(old[key])) return old;
    return { ...old, [key]: merged };
  }), []);
  const items = useMemo(() => viewItems(snapshot.items, filter, sort, direction), [snapshot.items, filter, sort, direction]);
  const index = items.findIndex(item => item.id === selected); const selectedItem = items[index];
  useEffect(() => { if (selected && !selectedItem) { setSelected(null); setNotice('The selected item is no longer in the current view.'); } }, [selected, selectedItem]);
  const choose = async () => {
    const current = ++intent.current; setBusy(true); setError(''); setNotice('');
    try { const result = await invoke<Snapshot | null>('choose_directory'); if (result && current === intent.current) { setSelected(null); apply(result); } }
    catch (error) { if (current === intent.current) setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    if (!snapshot.sessionId) return; const current = intent.current; setBusy(true); setError('');
    try { const value = await invoke<Snapshot>('refresh', { sessionId: snapshot.sessionId }); if (current === intent.current) { apply(value); setFacts({}); } }
    catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  };
  const closeFolder = async () => {
    if (!snapshot.sessionId) return;
    ++intent.current; setBusy(true); setError(''); setSelected(null);
    try {
      await invoke('close_gallery', { sessionId: snapshot.sessionId });
      apply(await invoke<Snapshot>('snapshot'));
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const images = snapshot.items.filter(item => item.kind === 'image').length;
  const status = snapshot.status === 'scanning' ? 'Scanning directory' : snapshot.status === 'partial' ? 'Partial discovery' : snapshot.status === 'unavailable' ? 'Directory unavailable' : snapshot.sessionId ? 'Discovery complete' : 'Choose a directory';
  const header = <header className="app-header"><div className="identity"><picture><source media="(prefers-color-scheme: light)" srcSet="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg" /><img src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg" alt="" /></picture><div><h1>Local Media Gallery</h1><p>Your media presented beautifully.</p></div></div><div className="header-actions"><Button onClick={() => void choose()} disabled={busy}><FolderOpen aria-hidden="true" />Choose folder</Button><Button variant="secondary" onClick={() => void refresh()} disabled={busy || !snapshot.sessionId}><RefreshCw aria-hidden="true" />Refresh</Button><Button variant="secondary" onClick={() => void closeFolder()} disabled={busy || !snapshot.sessionId}>Close folder</Button></div></header>;
  return <AppFrame host="tauri" header={header}><AppFrameEnvironmentBridge layoutResizeCanBeIme={false} />
    <section className="collection-summary" aria-label="Gallery status"><div><p className="eyebrow">Current directory</p><p className="root-path">{snapshot.root || 'No directory selected'}</p><p className="muted">Direct files only. Subdirectories and linked entries are excluded.</p></div><StatusBadge status={snapshot.status === 'unavailable' ? 'error' : snapshot.status === 'partial' ? 'warning' : 'neutral'}>{status}</StatusBadge></section>
    {error ? <p role="alert" className="media-error">{error}</p> : null}
    {snapshot.issues.length ? <div role="status" className="media-error">{snapshot.issues.map((issue, i) => <p key={`${issue}/${i}`}>{issue}</p>)}</div> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {snapshot.sessionId ? <><section className="collection-controls" aria-label="Collection controls">
      <Field id="media-filter" label="Media type" control={<FormControls.Select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">All media</option><option value="image">Images</option><option value="video">Videos</option></FormControls.Select>} />
      <Field id="media-sort" label="Sort by" control={<FormControls.Select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="name">Filename</option><option value="modified">Modified time</option><option value="size">File size</option></FormControls.Select>} />
      <Field id="media-direction" label="Direction" control={<FormControls.Select value={direction} onChange={event => setDirection(event.target.value as Direction)}><option value="asc">Ascending</option><option value="desc">Descending</option></FormControls.Select>} />
    </section><p className="collection-count" role="status">{items.length} shown / {snapshot.items.length} discovered ({images} images, {snapshot.items.length - images} videos){snapshot.status === 'scanning' ? ', scan in progress' : ''}</p></> : null}
    {items.length ? <section className="media-grid" aria-label="Media items">{items.map(item => <MediaCard key={keyOf(item)} snapshot={snapshot} item={item} facts={facts[keyOf(item)] || {}} updateFacts={updateFacts} open={setSelected} />)}</section>
      : <EmptyState id="gallery-empty" heading={snapshot.status === 'scanning' ? 'Finding media' : !snapshot.sessionId ? 'Open a media directory' : snapshot.status === 'unavailable' ? 'Directory unavailable' : filter !== 'all' && snapshot.items.length ? 'No media match this filter' : 'No media found'} description={!snapshot.sessionId ? 'Choose a directory to browse its images and videos.' : filter !== 'all' && snapshot.items.length ? 'Choose All media to see the current collection.' : 'Readable image and video files in this directory appear here.'} />}
    <footer className="app-footer">A ShruggieTech project</footer>
    {overlay && selectedItem ? createPortal(<Viewer snapshot={snapshot} item={selectedItem} facts={facts[keyOf(selectedItem)] || {}} updateFacts={updateFacts} previous={index > 0 ? () => setSelected(items[index - 1].id) : null} next={index < items.length - 1 ? () => setSelected(items[index + 1].id) : null} close={() => setSelected(null)} />, overlay) : null}
  </AppFrame>;
}
