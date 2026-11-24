// SPDX-License-Identifier: Apache-2.0
"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { assetKey } from "@/lib/api";
import { usePreview } from "@/lib/thumbnail";
import { buildLayout, LABEL_H } from "@/lib/layout";
import { fmtDate, fmtDur, fmtSize } from "@/lib/format";
import type { Asset, Config, MediaFacts } from "@/lib/types";
import Icon from "./Icon";

interface Props {
  items: Asset[];
  cfg: Config;
  resetKey: string;
  onOpen: (id: string) => void;
  onToggleFav: (a: Asset) => void;
  onFacts: (asset: Asset, facts: MediaFacts) => void;
}

const OVERSCAN = 700;

export default function GalleryView({ items, cfg, resetKey, onOpen, onToggleFav, onFacts }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [top, setTop] = useState(0);
  const raf = useRef(0);

  useLayoutEffect(() => {
    const el = scroller.current!;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf.current); };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) {
      el.scrollTop = 0;
      setTop(0);
    }
  }, [resetKey]);

  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      setTop(scroller.current?.scrollTop ?? 0);
    });
  }, []);

  const layout = useMemo(
    () => buildLayout(items, box.w, cfg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, box.w, cfg.view, cfg.gridSize, cfg.tileColumns, cfg.listSize, cfg.showNames],
  );

  const visible = layout.query(top - OVERSCAN, top + box.h + OVERSCAN);
  const label = cfg.showNames && cfg.view !== "list" ? LABEL_H : 0;

  return (
    <div className="gallery-scroll" ref={scroller} onScroll={onScroll} data-testid="gallery-scroll">
      <div className="gallery-canvas" style={{ height: layout.height }}>
        {visible.map((i) => {
          const a = items[i];
          if (!a) return null;
          const common = {
            a,
            x: layout.x[i],
            y: layout.y[i],
            w: layout.w[i],
            h: layout.h[i],
            onOpen,
            onToggleFav,
            onFacts,
          };
          return cfg.view === "list" ? (
            <ListRow key={assetKey(a)} {...common} size={cfg.listSize} />
          ) : (
            <Tile key={assetKey(a)} {...common} showName={cfg.showNames} fit={cfg.view === "grid" ? cfg.fit : "cover"} labelH={label} />
          );
        })}
      </div>
    </div>
  );
}

interface ItemProps {
  a: Asset;
  x: number;
  y: number;
  w: number;
  h: number;
  onOpen: (id: string) => void;
  onToggleFav: (a: Asset) => void;
  onFacts: (asset: Asset, facts: MediaFacts) => void;
}

function Preview({ a, fit, onFacts }: { a: Asset; fit: "cover" | "contain"; onFacts: ItemProps["onFacts"] }) {
  const url = usePreview(a, onFacts);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Cached images can finish loading before React attaches onLoad, so check `complete` too.
  useEffect(() => {
    setBroken(false);
    const im = ref.current;
    setLoaded(!!im && im.complete && im.naturalWidth > 0);
  }, [url]);
  return (
    <div className={"preview" + (loaded ? " is-loaded" : "")}>
      {url && !broken ? (
        <img
          ref={ref}
          src={url}
          alt=""
          decoding="async"
          draggable={false}
          style={{ objectFit: fit }}
          onLoad={(e) => {
            setLoaded(true);
            const im = e.currentTarget;
            if (a.w === 0 && im.naturalWidth && a.kind === 0 && !url.startsWith("blob:")) {
              onFacts(a, { w: im.naturalWidth, h: im.naturalHeight, dur: 0 });
            }
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="preview-ph">
          <Icon name={a.kind === 1 ? "video" : "image"} size={28} />
        </span>
      )}
    </div>
  );
}

const Tile = memo(function Tile(p: ItemProps & { showName: boolean; fit: "cover" | "contain"; labelH: number }) {
  const { a, x, y, w, h, labelH } = p;
  const open = () => p.onOpen(a.id);
  return (
    <div
      className="tile"
      style={{ transform: `translate(${x}px, ${y}px)`, width: w, height: h + labelH }}
    >
      <button type="button" className="open-media" aria-label={a.name} onClick={open} />
      <div className="tile-media" style={{ height: h }}>
        <Preview a={a} fit={p.fit} onFacts={p.onFacts} />
        {a.kind === 1 && (
          <span className="tile-badge">
            <Icon name="play" size={11} fill="currentColor" />
            {fmtDur(a.dur)}
          </span>
        )}
        <button
          type="button"
          className={"fav-btn" + (a.fav ? " is-on" : "")}
          aria-label={a.fav ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={a.fav}
          onClick={(e) => {
            e.stopPropagation();
            p.onToggleFav(a);
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Icon name="star" size={15} fill={a.fav ? "currentColor" : "none"} />
        </button>
      </div>
      {labelH > 0 && (
        <div className="tile-label" style={{ height: labelH }} title={a.path}>
          {a.name}
        </div>
      )}
    </div>
  );
});

const ListRow = memo(function ListRow(p: ItemProps & { size: number }) {
  const { a, x, y, w, h, size } = p;
  const open = () => p.onOpen(a.id);
  return (
    <div
      className="list-row"
      style={{ transform: `translate(${x}px, ${y}px)`, width: w, height: h }}
    >
      <button type="button" className="open-media" aria-label={a.name} onClick={open} />
      <div className="list-thumb" style={{ width: size, height: size }}>
        <Preview a={a} fit="cover" onFacts={p.onFacts} />
        {a.kind === 1 && (
          <span className="tile-badge tile-badge--sm">
            <Icon name="play" size={10} fill="currentColor" />
          </span>
        )}
      </div>
      <div className="list-main">
        <div className="list-name">{a.name}</div>
        <div className="list-path">{a.dir || "/"}</div>
      </div>
      <div className="list-cell list-type">{a.ext.toUpperCase()}</div>
      <div className="list-cell list-dims">{a.w > 0 ? `${a.w} × ${a.h}` : "—"}</div>
      <div className="list-cell list-dur">{a.kind === 1 ? fmtDur(a.dur) : ""}</div>
      <div className="list-cell list-size">{fmtSize(a.size)}</div>
      <div className="list-cell list-date">{fmtDate(a.mtime)}</div>
      <button
        type="button"
        className={"fav-btn fav-btn--static" + (a.fav ? " is-on" : "")}
        aria-label={a.fav ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={a.fav}
        onClick={(e) => {
          e.stopPropagation();
          p.onToggleFav(a);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Icon name="star" size={16} fill={a.fav ? "currentColor" : "none"} />
      </button>
    </div>
  );
});
