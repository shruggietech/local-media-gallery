// SPDX-License-Identifier: Apache-2.0
'use client';

import { type ComponentProps, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { PRODUCT_VERSION } from '../lib/product-version';
import { listen } from '@tauri-apps/api/event';
import { AppFrame, Button, EmptyState, Field, FormControls, IconButton, StatusBadge } from '@brand/web/react/server';
import { AppFrameEnvironmentBridge } from '@brand/web/react/environment';
import { FolderOpen, Image as ImageIcon, Video, RefreshCw, ChevronLeft, ChevronRight, SlidersHorizontal, Settings, X, Info } from 'lucide-react';
import type { Direction, Filter, MediaFacts, MediaItem, Snapshot, Sort, ViewSettings } from '../lib/types';
import { formatBytes, formatModified, masonryLayout, mediaUrl, pageItems, viewItems, acceptSnapshot, anchoredPage } from '../lib/view';
import { createAdmissionQueue, type LoadOutcome } from '../lib/admission';
import { createLoadingPolicy } from '../lib/loading-policy';
import { useGalleryState } from '../lib/use-gallery-state';
import { SaveDestinationControl, StateControls } from '../lib/state-controls';
import { MetadataInspector } from '../lib/metadata-inspector';
import {GuidedPreparation} from '../lib/guided-preparation';
import {usePreparation,PreparationControls,PreparationProgress,type Preparation} from '../lib/preparation';
import {Diagnostics} from '../lib/diagnostics';
import {useThumbnail} from '../lib/thumbnail';

const initial: Snapshot = { version: PRODUCT_VERSION, sequence: '0', discovery: null, sessionId: null, root: null, nativeRoot: null, status: 'selection', revision: '0', mediaOrigin: '', metadataRevision: '0', items: [], issues: [] };
const emptyFacts: MediaFacts = {};
const keyOf = (item: MediaItem) => item.id + '/' + item.revision;
const errorText = (error: unknown) => typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error);
function videoErrorMessage(code: number | undefined) {
  if (code === 1) return 'Video loading was interrupted. Refresh to check the folder again.';
  if (code === 2) return 'This video could not be read. Refresh to check the folder again.';
  if (code === 3) return 'This video could not be decoded. Refresh to check the folder again.';
  if (code === 4) return 'This video format or codec is unavailable in the current runtime.';
  return 'This video is unavailable. Refresh to check the folder again.';
}
type Queue = ReturnType<typeof createAdmissionQueue>;
type LoadingPolicy = ReturnType<typeof createLoadingPolicy>;

// The delivered Button accepts native ARIA attributes. Its legacy lint selector
// omits disclosure ARIA names; keep this narrow typed binding visible locally.
function DisclosureButton({ expanded, controls, ...props }: ComponentProps<typeof Button> & { expanded: boolean; controls: string }) {
  const semantics: Pick<ComponentProps<typeof Button>, 'aria-expanded' | 'aria-controls'> = { 'aria-expanded': expanded, 'aria-controls': controls };
  return <Button {...props} {...semantics} />;
}


const MediaCard = memo(function MediaCard({ snapshot, item, facts, updateFacts, open, queue, cacheQueue, thumbnailEpoch, margin, width, position, measure }: { snapshot: Snapshot; item: MediaItem; facts: MediaFacts; updateFacts: (key: string, facts: MediaFacts) => void; open: (id: string) => void; queue: Queue; cacheQueue:Queue; thumbnailEpoch:number; margin: number; width: number; position: { x: number; y: number }; measure: (key: string, height: number) => void }) {
  const container = useRef<HTMLElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [interested, setInterested] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const settled = useRef<((outcome?: LoadOutcome) => void) | null>(null);
  const key = keyOf(item);
  const source = mediaUrl(snapshot, item);
  const thumbnail=useThumbnail(snapshot,item,interested,cacheQueue,thumbnailEpoch);
  useLayoutEffect(() => {
    const element = container.current; if (!element) return;
    const observe = () => measure(key, element.getBoundingClientRect().height);
    observe(); const observer = new ResizeObserver(observe); observer.observe(element);
    return () => observer.disconnect();
  }, [key, measure]);
  useEffect(() => {
    const element = container.current; if (!element) return;
    const observer = new IntersectionObserver(entries => setInterested(entries.some(entry => entry.isIntersecting)), { root: document.querySelector('.bb-app-frame__scroll'), rootMargin: margin + '% 0%' });
    observer.observe(element); return () => observer.disconnect();
  }, [margin]);
  const needsVideoFacts = item.kind === 'video' && facts.duration === undefined;
  useEffect(() => {
    if (!interested || !source || thumbnail.ready || facts.error || item.kind === 'video' && !needsVideoFacts) return;
    const priority = () => {
      const bounds = container.current?.getBoundingClientRect();
      const viewport = document.querySelector('.bb-app-frame__scroll')?.getBoundingClientRect();
      return bounds && viewport ? Math.max(0, viewport.top - bounds.bottom, bounds.top - viewport.bottom) : 0;
    };
    return queue.request(done => {
      settled.current = done; setAdmitted(true);
      return () => {
        settled.current = null;
        image.current?.removeAttribute('src');
        const element = video.current;
        if (element) { element.pause(); element.removeAttribute('src'); element.load(); }
        setAdmitted(false);
      };
    }, priority);
  }, [interested, source, thumbnail.ready, facts.error, item.kind, needsVideoFacts, queue]);
  const ratio = thumbnail.ready && thumbnail.width && thumbnail.height ? thumbnail.width / thumbnail.height : facts.width && facts.height ? facts.width / facts.height : 1;
  return <article className="media-card" ref={container} data-name={item.name} data-item-id={item.id} style={{ width, transform: 'translate(' + position.x + 'px,' + position.y + 'px)' }}>
    <button className="media-open" onClick={() => open(item.id)} aria-label={'Open ' + item.name}>
      <span className="media-surface" data-thumbnail={thumbnail.ready} style={{ aspectRatio: ratio }}>
      {thumbnail.source?<img className="card-thumbnail" hidden={!thumbnail.ready} src={thumbnail.source} alt="" crossOrigin="anonymous" onLoad={e=>thumbnail.loaded(e.currentTarget)} onError={e=>thumbnail.failed(e.currentTarget)}/>:null}
      {item.kind === 'image' && admitted && source && !facts.error
        ? <img ref={image} src={source} alt={item.name} crossOrigin="anonymous" decoding="async"
          onLoad={event => {
            const element = event.currentTarget; const done = settled.current;
            if (image.current !== element || !element.getAttribute('src') || !done) return;
            updateFacts(key, { width: element.naturalWidth, height: element.naturalHeight });
            void element.decode().then(() => {
              if (image.current === element && settled.current === done) { settled.current = null; done?.(); }
            }, () => {
              if (image.current === element && settled.current === done) { settled.current = null; updateFacts(key, { error: 'This image could not be decoded in the current runtime. Refresh to check the folder again.' }); done?.('failure'); }
            });
          }}
          onError={event => { const done = settled.current; if (image.current !== event.currentTarget || !event.currentTarget.getAttribute('src')) return; settled.current = null; updateFacts(key, { error: 'This image is unavailable or unsupported in the current runtime. Refresh to check the folder again.' }); done?.('failure'); }} />
        : <span className="media-placeholder">{item.kind === 'video' ? <Video aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}<span>{facts.error ? 'Media unavailable' : item.kind === 'video' ? 'Video' : 'Image'}</span></span>}
      </span>
      <span className="media-caption"><span title={item.name}>{item.name}</span><StatusBadge status={facts.error || item.issue || item.stale ? 'warning' : 'neutral'}>{facts.error || item.issue ? 'Unavailable' : item.stale ? 'Not rechecked' : item.kind === 'image' ? 'Image' : 'Video'}</StatusBadge></span>
    </button>
    {needsVideoFacts && admitted && source && !facts.error ? <video className="metadata-probe" ref={video} crossOrigin="anonymous" preload="metadata" src={source} aria-hidden="true" tabIndex={-1}
      onLoadedMetadata={event => {
        const element = event.currentTarget;
        const done = settled.current; if (video.current !== element || !done) return; settled.current = null;
        updateFacts(key, { width: element.videoWidth, height: element.videoHeight, duration: element.duration });
        element.removeAttribute('src'); element.load(); done();
      }}
      onError={event => { const done = settled.current; if (video.current !== event.currentTarget || !event.currentTarget.getAttribute('src')) return; settled.current = null; updateFacts(key, { error: videoErrorMessage(event.currentTarget.error?.code) }); done?.('failure'); }} /> : null}
  </article>;
});

function MediaGrid({ snapshot, items, facts, updateFacts, open, cardSize, saveHeight, policy, thumbnailEpoch }: { snapshot: Snapshot; items: MediaItem[]; facts: Record<string, MediaFacts>; updateFacts: (key: string, facts: MediaFacts) => void; open: (id: string) => void; cardSize: ViewSettings['cardSize']; saveHeight: (height: number) => void; policy: LoadingPolicy; thumbnailEpoch:number }) {
  const container = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const queue = useMemo(() => createAdmissionQueue(policy.snapshot().limit, { onStart: () => policy.observe() }), [policy]);
  const cacheQueue=useMemo(()=>createAdmissionQueue(2),[]);
  useEffect(()=>()=>cacheQueue.cancelAll(),[cacheQueue]);
  const [budget, setBudget] = useState(policy.snapshot());
  const [visible, setVisible] = useState(true);
  const [stats, setStats] = useState(queue.snapshot());
  useEffect(() => {
    const stop = queue.subscribe(() => setStats(queue.snapshot()));
    const unwatch = policy.subscribe(() => { const next = policy.snapshot(); queue.setLimit(next.limit); setBudget(next); });
    return () => { stop(); unwatch(); queue.cancelAll(); policy.retire(performance.now()); };
  }, [queue, policy]);
  useLayoutEffect(() => {
    const changed = () => { const showing = document.visibilityState === 'visible'; queue.setPaused(!showing); cacheQueue.setPaused(!showing); setVisible(showing); if (!showing) policy.retire(performance.now()); };
    changed(); document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, [queue, cacheQueue, policy]);
  const demand = stats.active > 0 || stats.pending > 0;
  useEffect(() => {
    if (!visible || !demand) { policy.evaluate({ ...queue.snapshot(), at: performance.now(), visible }); return; }
    let frame = 0; let previous: number | null = null; let alive = true;
    const tick = (at: number) => {
      if (!alive || document.visibilityState !== 'visible') return;
      if (previous !== null) policy.frame(at - previous); previous = at;
      policy.evaluate({ ...queue.snapshot(), at, visible: true });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(frame); };
  }, [queue, policy, visible, demand]);
  useLayoutEffect(() => {
    const element = container.current; if (!element) return;
    const resize = () => setWidth(element.getBoundingClientRect().width);
    resize(); const observer = new ResizeObserver(resize); observer.observe(element); return () => observer.disconnect();
  }, []);
  const measure = useCallback((key: string, height: number) => setHeights(old => Math.abs((old[key] ?? 0) - height) < 0.5 ? old : { ...old, [key]: height }), []);
  const minimum = cardSize === 'small' ? 192 : cardSize === 'large' ? 384 : 240;
  const sizing = masonryLayout(width, minimum, []);
  const layout = masonryLayout(width, minimum, items.map(item => heights[keyOf(item)] ?? sizing.width / ((facts[keyOf(item)]?.width ?? 1) / (facts[keyOf(item)]?.height ?? 1)) + 48));
  useLayoutEffect(() => saveHeight(layout.height), [layout.height, saveHeight]);
  return <section className="media-grid" ref={container} aria-label="Media items" data-active-loads={stats.active} data-peak-loads={stats.peak} data-pending-loads={stats.pending} data-loading-mode={budget.mode} data-loading-limit={budget.limit} data-loading-reason={budget.reason} data-loading-generation={budget.generation} data-cleanup-errors={stats.errors} style={{ height: layout.height }}>
    {visible ? items.map((item, index) => <MediaCard key={keyOf(item)} snapshot={snapshot} item={item} facts={facts[keyOf(item)] || emptyFacts} updateFacts={updateFacts} open={open} queue={queue} cacheQueue={cacheQueue} thumbnailEpoch={thumbnailEpoch} margin={budget.margin} width={layout.width} position={layout.positions[index]} measure={measure} />) : null}
  </section>;
}

function ScrollIndicator({ mode, contentKey }: { mode: ViewSettings['scrollIndicator']; contentKey: string }) {
  const [metrics, setMetrics] = useState({ top: 0, height: 0, thumb: 0, offset: 0, overflow: false });
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    const element = document.querySelector<HTMLElement>('.bb-app-frame__scroll'); if (!element) return;
    let timer: ReturnType<typeof setTimeout>; let frame = 0;
    const update = () => {
      frame = 0;
      const track = Math.max(0, element.clientHeight - 24);
      const thumb = Math.min(track, Math.max(32, track * element.clientHeight / Math.max(1, element.scrollHeight)));
      setMetrics({ top: element.getBoundingClientRect().top + 12, height: track, thumb, offset: (track - thumb) * element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight), overflow: element.scrollHeight > element.clientHeight + 1 });
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); setScrolling(true); clearTimeout(timer); timer = setTimeout(() => setScrolling(false), 900); };
    update(); element.addEventListener('scroll', scroll, { passive: true });
    const observer = new ResizeObserver(update); observer.observe(element); const content = element.firstElementChild; if (content) observer.observe(content);
    return () => { element.removeEventListener('scroll', scroll); observer.disconnect(); clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [contentKey]);
  return <div className="scroll-indicator" data-visible={metrics.overflow && (mode === 'always' || scrolling)} aria-hidden="true" style={{ top: metrics.top, height: metrics.height }}><span className="scroll-indicator__thumb" style={{ height: metrics.thumb, transform: 'translateY(' + metrics.offset + 'px)' }} /></div>;
}

function Viewer({ snapshot, item, facts, updateFacts, expanded, toggleInformation, previous, next, close, refresh, busy, scanning, cancelDiscovery, warning, destinationControl, summaryFields, changeSummary, settingsReady, preparation }: { snapshot: Snapshot; item: MediaItem; facts: MediaFacts; updateFacts: (key: string, facts: MediaFacts) => void; expanded: boolean; toggleInformation: () => void; previous: (() => void) | null; next: (() => void) | null; close: () => void; refresh: () => void; busy: boolean; scanning: boolean; cancelDiscovery: () => void; warning: string; destinationControl: React.ReactNode; summaryFields: ViewSettings['summaryFields']; changeSummary: (fields:ViewSettings['summaryFields'])=>void; settingsReady:boolean; preparation:Preparation }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState('');
  const key = keyOf(item);
  useEffect(() => {
    const element = dialog.current; element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  useEffect(() => {
    const element = video.current; setPlaying(false); setPlayError('');
    // Select the configured source after the modal is connected and shown.
    // WebKit's WebM player can fail when its first load starts on the detached node.
    element?.load();
    return () => { if (element) { element.pause(); element.removeAttribute('src'); element.load(); } };
  }, [key]);
  useEffect(() => { const element = video.current; if (!facts.error && element?.error) element.load(); }, [facts.error, key]);
  const play = async () => {
    const element = video.current; if (!element) return;
    try { if (element.paused) await element.play(); else element.pause(); }
    catch (error) { setPlayError('Playback could not start: ' + errorText(error)); void invoke('report_media_observation',{sessionId:snapshot.sessionId,itemId:item.id,itemRevision:item.revision,observation:'playbackRejected'}).catch(()=>{}); }
  };
  const source = mediaUrl(snapshot, item);
  return <dialog className="bb-dialog media-viewer" ref={dialog} aria-labelledby="viewer-title" aria-describedby="viewer-description" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="viewer-header"><h2 id="viewer-title" title={item.name}>{item.name}</h2><div className="header-actions"><DisclosureButton variant="ghost" expanded={expanded} controls="viewer-information" onClick={toggleInformation}><Info aria-hidden="true" />Information</DisclosureButton>{scanning ? <Button variant="secondary" onClick={cancelDiscovery}>Cancel discovery</Button> : null}<Button variant="ghost" onClick={refresh} disabled={busy || scanning}><RefreshCw aria-hidden="true" />Refresh</Button><Button variant="secondary" onClick={close}>Close viewer</Button></div></header>
    <div className="viewer-preparation"><PreparationProgress state={preparation}/></div><p id="viewer-description" className="viewer-description">Focused media. Information is available from its toggle.</p><p className="viewer-description" role="status" aria-atomic="true">{item.name}</p>
    <div className="viewer-content" data-information={expanded}>
      <div className="viewer-media">
        {item.kind === 'video'
          ? <video key={key} ref={video} controls crossOrigin="anonymous" preload="metadata" src={source} aria-label={'Video ' + item.name}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onLoadedMetadata={event => updateFacts(key, { width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, duration: event.currentTarget.duration })}
            onError={event => updateFacts(key, { error: videoErrorMessage(event.currentTarget.error?.code) })} />
          : !facts.error ? <img key={key} src={source} alt={item.name} crossOrigin="anonymous"
            onLoad={event => updateFacts(key, { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => updateFacts(key, { error: 'This image is unavailable or unsupported in the current runtime. Refresh to check the folder again.' })} /> : <ImageIcon aria-hidden="true" />}
      </div>
      {expanded ? <section className="viewer-information" id="viewer-information" aria-labelledby="information-title"><h3 id="information-title">Item information</h3><dl className="item-facts">
        <dt>Source</dt><dd>Current filesystem observations; dimensions and duration from the native media runtime.</dd><dt>Filename</dt><dd>{item.name}</dd><dt>Relative location</dt><dd>{item.relativePath}</dd><dt>Media type</dt><dd>{item.kind} ({item.mime}, filename hint)</dd>
        <dt>File size</dt><dd>{formatBytes(item.size)}</dd><dt>Modified</dt><dd>{formatModified(item.modifiedMs)}</dd>
        <dt>Dimensions</dt><dd>{facts.width && facts.height ? facts.width + ' × ' + facts.height : 'Unavailable'}</dd>
        <dt>Duration</dt><dd>{item.kind !== 'video' ? 'Not applicable' : Number.isFinite(facts.duration) ? facts.duration?.toFixed(2) + ' seconds' : 'Unavailable'}</dd>
      </dl><MetadataInspector snapshot={snapshot} item={item} fields={summaryFields} change={changeSummary} ready={settingsReady} /></section> : null}
    </div>
    <footer>{destinationControl}<div className="viewer-actions"><Button variant="secondary" disabled={!previous} onClick={() => previous?.()}><ChevronLeft aria-hidden="true" />Previous</Button>{item.kind === 'video' ? <Button onClick={play}>{playing ? 'Pause' : 'Play'}</Button> : null}<Button variant="secondary" disabled={!next} onClick={() => next?.()}>Next<ChevronRight aria-hidden="true" /></Button></div>{warning ? <p role="status" className="media-error">{warning}</p> : null}{facts.error || item.issue || playError ? <p role="status" className="media-error">{facts.error || item.issue || playError}</p> : null}</footer>
  </dialog>;
}

export default function Gallery() {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const state = useGalleryState();
  const preparation=usePreparation(snapshot.sessionId);
  const { settings, ready: settingsReady, warning: settingsWarning, activate, change: changeSettings } = state;
  const prepared=useCallback(()=>{state.reload();preparation.invalidate();},[state.reload,preparation.invalidate]);
  const loadingPolicy = useMemo(() => createLoadingPolicy('automatic', performance.now()), [snapshot.sessionId]);
  useLayoutEffect(() => { loadingPolicy.setMode(settings.loadingMode, performance.now()); }, [loadingPolicy, settings.loadingMode]);
  const testPageSize = state.envelope?.testPageSize;
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--gallery-font-scale', String(settings.fontScale / 100));
    return () => { document.documentElement.style.removeProperty('--gallery-font-scale'); };
  }, [settings.fontScale]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [page, setPage] = useState(1); const [pageDraft, setPageDraft] = useState('1');
  const [selected, setSelected] = useState<string | null>(null);
  const [facts, setFacts] = useState<Record<string, MediaFacts>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const intent = useRef(0); const latest = useRef<Snapshot>(initial); const activeKeys = useRef(new Set<string>());
  const gridHeight = useRef(0); const returnScroll = useRef(0); const returnTarget = useRef<string | null>(null);
  const anchor = useRef<string | null>(null);
  const presentation = useRef({ settings, page, selected }); presentation.current = { settings, page, selected };
  const apply = useCallback((value: Snapshot, ticket?: number) => {
    const old = latest.current;
    if (ticket !== undefined && ticket !== intent.current) return;
    if (!acceptSnapshot(old, value)) return;
    activate(value.sessionId);
    if (old.sequence === value.sequence && JSON.stringify(old) === JSON.stringify(value)) return;
    if (old.sessionId !== value.sessionId) { intent.current += 1; setSelected(null); setPage(1); anchor.current = null; returnTarget.current = null; }
    else {
      const view = presentation.current;
      const sorted = (items: MediaItem[]) => viewItems(items, view.settings.filter, view.settings.sort, view.settings.direction);
      const anchored = anchoredPage(sorted(old.items), sorted(value.items), view.page, view.settings.pageSize, view.selected, anchor.current);
      anchor.current = anchored.anchor; setPage(anchored.page);
      if (anchored.removed && value.status === "complete") setNotice("The previous location changed. Showing a neighboring item or the empty view.");
    }
    if (old.sessionId === value.sessionId && value.discovery?.kind === 'refresh' && ['complete', 'partial'].includes(value.discovery.phase) && (old.discovery?.id !== value.discovery.id || old.discovery?.phase !== value.discovery.phase)) {
      const confirmed = new Set(value.items.filter(item => !item.stale && !item.issue).map(keyOf));
      setFacts(previous => {
        let changed = false;
        const entries = Object.entries(previous).map(([key, facts]) => {
          if (!confirmed.has(key) || !facts.error) return [key, facts];
          const clean = { ...facts }; delete clean.error; changed = true; return [key, clean];
        });
        return changed ? Object.fromEntries(entries) : previous;
      });
    }
    latest.current = value; activeKeys.current = new Set(value.items.map(keyOf)); setSnapshot(value);
  }, [activate]);
  useEffect(() => {
    setOverlay(document.getElementById('bb-overlay-root'));
    const preference = window.matchMedia('(prefers-color-scheme: light)');
    const theme = () => document.documentElement.classList.toggle('bb-light', preference.matches);
    theme(); preference.addEventListener('change', theme);
    let alive = true; let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const stop = await listen<Snapshot>('gallery-changed', event => { if (alive) apply(event.payload); });
        if (!alive) { stop(); return; } unlisten = stop;
        const ticket = intent.current;
        const value = await invoke<Snapshot>('startup'); if (alive) apply(value, ticket);
      } catch (error) { if (alive) setError('The native gallery is unavailable: ' + errorText(error)); }
    })();
    return () => { alive = false; unlisten?.(); preference.removeEventListener('change', theme); };
  }, [apply]);
  useEffect(() => {
    const keep = new Set(snapshot.items.map(keyOf));
    setFacts(old => Object.fromEntries(Object.entries(old).filter(([key]) => keep.has(key))));
  }, [snapshot.sessionId, snapshot.revision]);
  const updateFacts = useCallback((key: string, value: MediaFacts) => setFacts(old => {
    if (!activeKeys.current.has(key)) return old;
    if(value.error){const item=latest.current.items.find(item=>keyOf(item)===key);if(item)void invoke('report_media_observation',{sessionId:latest.current.sessionId,itemId:item.id,itemRevision:item.revision,observation:item.kind==='image'?'imageDecode':'videoDecode'}).catch(()=>{});}
    const merged = { ...old[key], ...value };
    if (JSON.stringify(merged) === JSON.stringify(old[key])) return old;
    return { ...old, [key]: merged };
  }), []);
  const items = useMemo(() => viewItems(snapshot.items, settings.filter, settings.sort, settings.direction), [snapshot.items, settings.filter, settings.sort, settings.direction]);
  const paged = useMemo(() => pageItems(items, page, settings.pageSize), [items, page, settings.pageSize]);
  useEffect(() => { if (page !== paged.page) setPage(paged.page); }, [page, paged.page]);
  useEffect(() => setPageDraft(String(paged.page)), [paged.page]);
  const index = items.findIndex(item => item.id === selected); const selectedItem = items[index];
  useEffect(() => { if (selected && !selectedItem) { setSelected(null); setNotice('The selected item is no longer in the current view.'); returnTarget.current = null; document.getElementById('bb-main')?.focus(); } }, [selected, selectedItem]);
  useLayoutEffect(() => {
    if (selected || !returnTarget.current) return;
    const id = returnTarget.current; returnTarget.current = null;
    const frame = requestAnimationFrame(() => {
      const scroller = document.querySelector<HTMLElement>('.bb-app-frame__scroll'); if (scroller) scroller.scrollTop = returnScroll.current;
      const card = [...document.querySelectorAll<HTMLElement>('.media-card')].find(card => card.dataset.itemId === id);
      const button = card?.querySelector<HTMLButtonElement>('button'); button?.focus({ preventScroll: true });
      if (card && scroller) { const rect = card.getBoundingClientRect(); const viewport = scroller.getBoundingClientRect(); if (rect.top < viewport.top || rect.bottom > viewport.bottom) card.scrollIntoView({ block: 'nearest' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, paged.page]);
  const saveHeight = useCallback((height: number) => { gridHeight.current = height; }, []);
  const open = useCallback((id: string) => { returnScroll.current = document.querySelector('.bb-app-frame__scroll')?.scrollTop || 0; setSelected(id); }, []);
  const closeViewer = () => { if (!selectedItem) return; anchor.current = selectedItem.id; returnTarget.current = selectedItem.id; setPage(Math.floor(index / settings.pageSize) + 1); setSelected(null); };
  const navigate = (offset: number) => { const target = items[index + offset]; if (target) { anchor.current = target.id; setSelected(target.id); setPage(Math.floor((index + offset) / settings.pageSize) + 1); } };
  const choose = async () => {
    const current = ++intent.current; setBusy(true); setError(''); setNotice('');
    try { const result = await invoke<Snapshot | null>('choose_directory'); if (result) apply(result, current); }
    catch (error) { if (current === intent.current) setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    if (!snapshot.sessionId || busy) return; const current = intent.current; setBusy(true); setError('');
    try { const value = await invoke<Snapshot>('refresh', { sessionId: snapshot.sessionId }); apply(value, current); }
    catch (error) { if (current === intent.current) setError(errorText(error)); } finally { setBusy(false); }
  };
  const closeFolder = async () => {
    if (!snapshot.sessionId || busy) return;
    const current = ++intent.current; setBusy(true); setError(''); setSelected(null);
    try { apply(await invoke<Snapshot>('close_gallery', { sessionId: snapshot.sessionId }), current); }
    catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const changeView = (patch: import('../lib/types').SettingsPatch) => { anchor.current = null; setPage(1); changeSettings(patch); };
  const goPage = (requested: number) => { const destination = pageItems(items, requested, settings.pageSize); anchor.current = destination.items[0]?.id ?? null; setPage(destination.page); document.querySelector('.bb-app-frame__scroll')?.scrollTo({ top: 0 }); };
  const images = snapshot.items.filter(item => item.kind === 'image').length;
  const scanning = snapshot.discovery?.phase === 'opening' || snapshot.discovery?.phase === 'scanning';
  const stale = snapshot.items.filter(item => item.stale).length;
  const status = snapshot.status === 'opening' ? 'Opening folder' : snapshot.status === 'scanning' ? 'Scanning directory' : snapshot.status === 'partial' ? 'Partial discovery' : snapshot.status === 'cancelled' ? 'Discovery cancelled' : snapshot.status === 'failed' ? 'Discovery failed' : snapshot.status === 'unavailable' ? 'Directory unavailable' : snapshot.sessionId ? 'Discovery complete' : 'Choose a directory';
  const cancelDiscovery = async () => {
    const operationId = latest.current.discovery?.id; if (!operationId) return;
    const current = intent.current;
    try { apply(await invoke<Snapshot>('cancel_discovery', { operationId }), current); }
    catch (error) { if (current === intent.current) setError(errorText(error)); }
  };
  const toggleControls = () => { if (settings.controlsExpanded) setSettingsOpen(false); changeSettings({ controlsExpanded: !settings.controlsExpanded }); };
  const reopen = async (id: string) => {
    const current = ++intent.current; setBusy(true); setError('');
    try { apply(await invoke<Snapshot>('reopen_recent', { id }), current); }
    catch (error) { if (current === intent.current) setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const destinationControl = (viewer = false) => <SaveDestinationControl value={state.destination} change={state.selectDestination} root={Boolean(snapshot.sessionId)} ready={settingsReady} viewer={viewer} />;
  const header = <header className="app-header"><div className="identity"><picture><source media="(prefers-color-scheme: light)" srcSet="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg" /><img src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg" alt="" /></picture><h1>Local Media Gallery</h1></div><span className="folder-title" title={snapshot.root || ''}>{snapshot.root || 'Choose a folder'}</span><div className="header-actions">{destinationControl()}<Button variant="ghost" onClick={() => void choose()} disabled={busy}><FolderOpen aria-hidden="true" />Choose folder</Button><Button variant="ghost" onClick={() => void refresh()} disabled={busy || scanning || !snapshot.sessionId}><RefreshCw aria-hidden="true" />Refresh</Button><IconButton label="Close folder" icon={<X />} onClick={() => void closeFolder()} disabled={busy || !snapshot.sessionId} /><DisclosureButton variant="ghost" expanded={settings.controlsExpanded} controls="collection-controls" disabled={!settingsReady} onClick={toggleControls}><SlidersHorizontal aria-hidden="true" />{settings.controlsExpanded ? 'Hide controls' : 'Show controls'}</DisclosureButton><DisclosureButton variant="ghost" expanded={settingsOpen && settings.controlsExpanded} controls="view-settings" disabled={!settingsReady} onClick={() => { setSettingsOpen(old => !old); if (!settings.controlsExpanded) changeSettings({ controlsExpanded: true }); }}><Settings aria-hidden="true" />Settings</DisclosureButton></div></header>;
  return <AppFrame host="tauri" header={header}><AppFrameEnvironmentBridge layoutResizeCanBeIme={false} />
    {settings.controlsExpanded ? <section className="collection-controls" id="collection-controls" aria-label="Collection controls">
      <Field id="media-filter" label="Media type" control={<FormControls.Select value={settings.filter} onChange={event => changeView({ filter: event.target.value as Filter })}><option value="all">All media</option><option value="image">Images</option><option value="video">Videos</option></FormControls.Select>} />
      <Field id="media-sort" label="Sort by" control={<FormControls.Select value={settings.sort} onChange={event => changeView({ sort: event.target.value as Sort })}><option value="name">Filename</option><option value="modified">Modified time</option><option value="size">File size</option></FormControls.Select>} />
      <Field id="media-direction" label="Direction" control={<FormControls.Select value={settings.direction} onChange={event => changeView({ direction: event.target.value as Direction })}><option value="asc">Ascending</option><option value="desc">Descending</option></FormControls.Select>} />
      <div className="collection-summary"><p className="root-path">{snapshot.root || 'No directory selected'}</p><p className="muted">Direct files only. Refresh to see changes.</p><StatusBadge status={snapshot.status === 'unavailable' ? 'error' : snapshot.status === 'partial' ? 'warning' : 'neutral'}>{status}</StatusBadge></div>
    </section> : null}
    {settingsOpen && settings.controlsExpanded ? <section className="settings-panel" id="view-settings" aria-label="View settings"><h2>View settings</h2>
      <Field id="font-scale" label="Global font size" control={<FormControls.Select value={settings.fontScale} onChange={event => changeSettings({ fontScale: Number(event.target.value) as ViewSettings['fontScale'] })}><option value="100">Default (100%)</option><option value="90">Small (90%)</option><option value="80">Smaller (80%)</option></FormControls.Select>} />
      <Field id="page-size" label="Items per page" control={<FormControls.Select value={settings.pageSize} onChange={event => changeView({ pageSize: Number(event.target.value) })}>{testPageSize === 4 ? <option value="4">4 (native test)</option> : null}<option value="24">24</option><option value="48">48</option><option value="96">96</option></FormControls.Select>} />
      <Field id="card-size" label="Card size" control={<FormControls.Select value={settings.cardSize} onChange={event => changeSettings({ cardSize: event.target.value as ViewSettings['cardSize'] })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></FormControls.Select>} />
      <Field id="loading-mode" label="Loading strategy" control={<FormControls.Select value={settings.loadingMode} onChange={event => changeSettings({ loadingMode: event.target.value as ViewSettings['loadingMode'] })}><option value="automatic">Automatic</option><option value="conservative">Conservative</option><option value="standard">Standard</option></FormControls.Select>} />
      <p className="muted">Automatic adapts loading work during this folder session. Conservative and Standard keep fixed limits without changing items per page.</p>
      <Field id="scroll-indicator" label="Scroll indicator" control={<FormControls.Select value={settings.scrollIndicator} onChange={event => changeSettings({ scrollIndicator: event.target.value as ViewSettings['scrollIndicator'] })}><option value="auto">While scrolling</option><option value="always">Always visible</option></FormControls.Select>} />
      <p className="muted">Each explicit change saves to the selected destination. Gallery refresh is manual.</p>
    </section> : null}
    <PreparationProgress state={preparation}/>
    <StateControls envelope={state.envelope} remove={state.remove} clear={state.clear} forget={state.forget} reopen={id => void reopen(id)} busy={busy || !settingsReady} />
    <section className="discovery-status" aria-label="Discovery status"><div className="preparation-actions"><GuidedPreparation sessionId={snapshot.sessionId} envelope={state.envelope} completed={prepared}/><PreparationControls state={preparation} sessionId={snapshot.sessionId} items={snapshot.items}/><Diagnostics/></div><p role="status">{status}{snapshot.discovery ? ' (' + snapshot.discovery.entriesSeen + ' entries checked, ' + snapshot.discovery.mediaSeen + ' media observed)' : ''}{stale ? '. ' + stale + ' previous items not yet rechecked.' : ''}</p>{scanning ? <Button variant="secondary" onClick={() => void cancelDiscovery()}>Cancel discovery</Button> : snapshot.sessionId && snapshot.status !== 'complete' ? <Button variant="secondary" onClick={() => void refresh()} disabled={busy}>Retry discovery</Button> : null}</section>
    {error ? <p role="alert" className="media-error">{error}</p> : null}
    {settingsWarning ? <p role="status" className="media-error">{settingsWarning}</p> : null}
    {snapshot.issues.length ? <div role="status" className="media-error">{snapshot.issues.map((issue, i) => <p key={issue + '/' + i}>{issue}</p>)}</div> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {snapshot.sessionId ? <nav className="collection-navigation" aria-label="Gallery pages"><p className="collection-count" role="status">{paged.start}-{paged.end} of {items.length} / {snapshot.items.length} discovered ({images} images, {snapshot.items.length - images} videos)</p><Button variant="ghost" disabled={paged.page <= 1} onClick={() => goPage(paged.page - 1)}>Previous page</Button><Field id="page-jump" label="Page" layout="inline" control={<FormControls.TextInput type="number" min={1} max={paged.pages} value={pageDraft} onChange={event => setPageDraft(event.target.value)} onBlur={() => goPage(Number(pageDraft))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); goPage(Number(pageDraft)); } }} />} /><span>of {paged.pages}</span><Button variant="ghost" disabled={paged.page >= paged.pages} onClick={() => goPage(paged.page + 1)}>Next page</Button></nav> : null}
    {selectedItem ? <div className="gallery-placeholder" aria-hidden="true" style={{ height: gridHeight.current }} /> : items.length ? <MediaGrid key={snapshot.sessionId + '/' + paged.page + '/' + settings.pageSize + '/' + settings.filter + '/' + settings.sort + '/' + settings.direction} snapshot={snapshot} items={paged.items} facts={facts} updateFacts={updateFacts} open={open} cardSize={settings.cardSize} saveHeight={saveHeight} policy={loadingPolicy} thumbnailEpoch={preparation.epoch} />
      : <EmptyState id="gallery-empty" heading={scanning ? 'Finding media' : snapshot.status === 'cancelled' ? 'Discovery cancelled' : snapshot.status === 'failed' ? 'Discovery failed' : snapshot.status === 'unavailable' ? 'Directory unavailable' : !snapshot.sessionId ? 'Open a media directory' : settings.filter !== 'all' && snapshot.items.length ? 'No media match this filter' : 'No media found'} description={snapshot.status === 'unavailable' ? 'Retry the folder explicitly when available, or choose its current location.' : snapshot.status === 'cancelled' ? 'Available observations are retained. Refresh to check the folder again.' : snapshot.status === 'partial' || snapshot.status === 'failed' ? 'Discovery is incomplete. Retry explicitly or choose another folder.' : !snapshot.sessionId ? 'Choose a directory to browse its images and videos.' : settings.filter !== 'all' && snapshot.items.length ? 'Choose All media to see the current collection.' : 'Readable image and video files in this directory appear here. Use Refresh to check for changes.'} />}
    <footer className="app-footer">A ShruggieTech project</footer>
    <ScrollIndicator mode={settings.scrollIndicator} contentKey={snapshot.sessionId + '/' + snapshot.revision + '/' + paged.page + '/' + String(Boolean(selectedItem))} />
    {overlay && selectedItem ? createPortal(<Viewer snapshot={snapshot} item={selectedItem} facts={facts[keyOf(selectedItem)] || emptyFacts} updateFacts={updateFacts} expanded={settings.metadataExpanded} toggleInformation={() => changeSettings({ metadataExpanded: !settings.metadataExpanded })} previous={index > 0 ? () => navigate(-1) : null} next={index < items.length - 1 ? () => navigate(1) : null} close={closeViewer} refresh={() => void refresh()} busy={busy} scanning={scanning} cancelDiscovery={() => void cancelDiscovery()} warning={settingsWarning} destinationControl={destinationControl(true)} summaryFields={settings.summaryFields} changeSummary={fields=>changeSettings({summaryFields:fields})} settingsReady={settingsReady} preparation={preparation} />, overlay) : null}
  </AppFrame>;
}
