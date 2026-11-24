// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@brand/web/react/server";
import { assetKey, mediaUrl } from "@/lib/api";
import { fmtDateTime, fmtDur, fmtSize } from "@/lib/format";
import type { Asset, MediaFacts } from "@/lib/types";
import Icon from "./Icon";

interface Props {
  asset: Asset;
  position: number;
  count: number;
  previous?: () => void;
  next?: () => void;
  close: () => void;
  favorite: (asset: Asset) => void;
  facts: (asset: Asset, facts: MediaFacts) => void;
}

export default function Viewer({ asset, position, count, previous, next, close, favorite, facts }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [info, setInfo] = useState(false);
  const [failed, setFailed] = useState("");
  const key = assetKey(asset);

  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return <dialog ref={ref} className="viewer" aria-labelledby="viewer-title"
    onCancel={e => { e.preventDefault(); close(); }}
    onKeyDown={e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowLeft" && !(e.target instanceof HTMLVideoElement)) previous?.();
      else if (e.key === "ArrowRight" && !(e.target instanceof HTMLVideoElement)) next?.();
      else if (e.key.toLowerCase() === "f") favorite(asset);
      else if (e.key.toLowerCase() === "i") setInfo(value => !value);
      else return;
      e.preventDefault();
    }}>
    <header className="viewer-bar">
      <div className="viewer-name"><strong id="viewer-title">{asset.name}</strong><span className="mono">{position} / {count}</span></div>
      <div className="viewer-actions">
        <IconButton label={asset.fav ? "Remove from favorites" : "Add to favorites"} aria-pressed={asset.fav}
          icon={<Icon name="star" fill={asset.fav ? "currentColor" : "none"} />} onClick={() => favorite(asset)} />
        <IconButton label="Details" aria-pressed={info} onClick={() => setInfo(!info)} icon={<Icon name="info" />} />
        <IconButton label="Close viewer" autoFocus icon={<Icon name="close" />} onClick={close} />
      </div>
    </header>
    <div className="viewer-stage">
      {failed === key ? <p role="status">Media unavailable. The file may have moved or its format may require a different browser.</p>
        : asset.kind === 1 ? <video className="viewer-media" key={key} controls autoPlay playsInline src={mediaUrl(asset)}
          onError={() => setFailed(key)} onLoadedMetadata={e => {
            const v = e.currentTarget;
            facts(asset, { w: v.videoWidth, h: v.videoHeight, dur: Number.isFinite(v.duration) ? v.duration : 0 });
          }} />
        : <img className="viewer-media" key={key} alt={asset.name} src={mediaUrl(asset)} draggable={false}
          onError={() => setFailed(key)} onLoad={e => {
            const img = e.currentTarget;
            facts(asset, { w: img.naturalWidth, h: img.naturalHeight, dur: 0 });
          }} />}
    </div>
    {previous && <button type="button" className="nav-btn nav-prev" onClick={previous} aria-label="Previous"><Icon name="left" /></button>}
    {next && <button type="button" className="nav-btn nav-next" onClick={next} aria-label="Next"><Icon name="right" /></button>}
    {info && <aside className="viewer-info" aria-label="Media details">
      <dl>
        <dt>Path</dt><dd>{asset.path}</dd>
        <dt>Type</dt><dd>{asset.ext.toUpperCase()}</dd>
        {asset.w > 0 && <><dt>Dimensions</dt><dd>{asset.w} × {asset.h}</dd></>}
        {asset.kind === 1 && asset.dur > 0 && <><dt>Duration</dt><dd>{fmtDur(asset.dur)}</dd></>}
        <dt>Size</dt><dd>{fmtSize(asset.size)}</dd>
        <dt>Modified</dt><dd>{fmtDateTime(asset.mtime)}</dd>
      </dl>
    </aside>}
  </dialog>;
}
