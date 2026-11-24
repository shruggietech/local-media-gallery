// SPDX-License-Identifier: Apache-2.0
"use client";

import { Dialog } from "@brand/web/react/client";
import { Button, FormControls, IconButton } from "@brand/web/react/server";
import type { ReactNode, RefObject } from "react";
import type { Config, KindFilter, SortKey, ViewMode } from "@/lib/types";
import Icon, { type IconName } from "./Icon";

interface Props {
  cfg: Config;
  update: (p: Partial<Config>) => void;
  query: string;
  setQuery: (q: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  shown: number;
  total: number;
  scanning: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  root: string;
  onOpenFolder: () => void;
  onRefresh: () => void;
  settings: ReactNode;
  status: string;
  problem?: string;
  dismiss?: () => void;
}

const views: { id: ViewMode; label: string; icon: IconName }[] = [
  { id: "grid", label: "Grid", icon: "grid" },
  { id: "tiled", label: "Tiled", icon: "tiled" },
  { id: "list", label: "List", icon: "list" },
];

const kinds: { id: KindFilter; label: string; icon: IconName }[] = [
  { id: "all", label: "All", icon: "grid" },
  { id: "image", label: "Photos", icon: "image" },
  { id: "video", label: "Videos", icon: "video" },
  { id: "favorites", label: "Favorites", icon: "star" },
];

const sorts: { id: SortKey; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "date", label: "Date Modified" },
  { id: "size", label: "File Size" },
  { id: "type", label: "Type" },
  { id: "path", label: "Folder Path" },
];

export default function Toolbar(p: Props) {
  const { cfg, update } = p;
  const slider =
    cfg.view === "grid"
      ? { label: "Thumbnail Size", min: 100, max: 400, step: 10, value: cfg.gridSize, set: (v: number) => update({ gridSize: v }), text: `${cfg.gridSize}px` }
      : cfg.view === "tiled"
        ? { label: "Columns", min: 0, max: 10, step: 1, value: cfg.tileColumns, set: (v: number) => update({ tileColumns: v }), text: cfg.tileColumns === 0 ? "Auto" : String(cfg.tileColumns) }
        : { label: "Row Size", min: 40, max: 120, step: 8, value: cfg.listSize, set: (v: number) => update({ listSize: v }), text: `${cfg.listSize}px` };

  return (
    <header className="toolbar">
      <div className="toolbar-row">
        <button className="icon-btn" onClick={p.toggleSidebar} aria-pressed={p.sidebarOpen} title="Toggle folders" aria-label="Toggle folders">
          <Icon name="sidebar" />
        </button>
        <div className="brand" title="Local Media Gallery">
          <img className="logo logo-dark" src="/brand/logo-dark.svg" alt="Local Media Gallery" height={34} />
          <img className="logo logo-light" src="/brand/logo-light.svg" alt="" aria-hidden="true" height={34} />
        </div>

        <label className="search">
          <Icon name="search" size={16} />
          <input
            ref={p.searchRef}
            type="search"
            placeholder="Search files and folders  ( / )"
            value={p.query}
            onChange={(e) => p.setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (p.setQuery(""), e.currentTarget.blur())}
            aria-label="Search"
          />
        </label>

        <div className="seg" role="group" aria-label="Show">
          {kinds.map((k) => (
            <button key={k.id} className={"seg-btn" + (cfg.kind === k.id ? " is-on" : "")} aria-pressed={cfg.kind === k.id} onClick={() => update({ kind: k.id })} title={k.label} aria-label={k.label} disabled={!p.root}>
              <Icon name={k.icon} size={15} />
              <span className="seg-text">{k.label}</span>
            </button>
          ))}
        </div>

        <div className="spacer" />

        <Button variant="secondary" onClick={p.onOpenFolder}>Open folder</Button>
        <IconButton label="Refresh" icon={<Icon name="refresh" />} disabled={!p.root || p.scanning} onClick={p.onRefresh} />
        <Dialog triggerLabel="Settings" title="Settings" description="Appearance and gallery preferences for this folder.">
          <div className="settings-body">{p.settings}</div>
        </Dialog>
      </div>

      <div className="toolbar-row toolbar-row--sub">
        <div className="seg" role="group" aria-label="View">
          {views.map((v) => (
            <button key={v.id} className={"seg-btn" + (cfg.view === v.id ? " is-on" : "")} aria-pressed={cfg.view === v.id} onClick={() => update({ view: v.id })} title={`${v.label} view`} aria-label={`${v.label} view`} disabled={!p.root}>
              <Icon name={v.icon} size={15} />
              <span className="seg-text">{v.label}</span>
            </button>
          ))}
        </div>
        <label className="slider">
          <span className="slider-label">{slider.label}</span>
          <input type="range" disabled={!p.root} min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={(e) => slider.set(+e.target.value)} aria-label={slider.label} />
          <span className="slider-val mono">{slider.text}</span>
        </label>
        <div className="spacer" />
        <div className="sortbox">
          <FormControls.Select disabled={!p.root} value={cfg.sortKey} onChange={(e) => update({ sortKey: e.target.value as SortKey })} aria-label="Sort by">
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                Sort: {s.label}
              </option>
            ))}
          </FormControls.Select>
          <button className="icon-btn" onClick={() => update({ sortDir: cfg.sortDir === "asc" ? "desc" : "asc" })} title={cfg.sortDir === "asc" ? "Ascending" : "Descending"} aria-label="Toggle sort direction" disabled={!p.root}>
            <Icon name={cfg.sortDir === "asc" ? "up" : "down"} />
          </button>
        </div>
        <span className="count mono" aria-live="polite">
          {p.shown === p.total ? `${p.total.toLocaleString()} items` : `${p.shown.toLocaleString()} of ${p.total.toLocaleString()}`}
        </span>
      </div>
      {p.root && <div className="gallery-location mono" title={p.root}>{p.root}</div>}
      {p.status && <div className="gallery-message" role="status">{p.status}</div>}
      {p.problem && <div className="gallery-message error-text" role="alert">{p.problem}{p.dismiss && <IconButton label="Dismiss" icon={<Icon name="close" />} onClick={p.dismiss} />}</div>}
    </header>
  );
}
