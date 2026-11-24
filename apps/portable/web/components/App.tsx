// SPDX-License-Identifier: Apache-2.0
"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AppFrame, Button, Field, FormControls } from "@brand/web/react/server";
import { api, assetKey } from "@/lib/api";
import { collator } from "@/lib/format";
import type { Asset, Config, MediaFacts, Snapshot } from "@/lib/types";
import FolderDialog from "./FolderDialog";
import GalleryView from "./GalleryView";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import Viewer from "./Viewer";

const sorters: Record<Config["sortKey"], (a: Asset, b: Asset) => number> = {
  name: (a, b) => collator.compare(a.name, b.name),
  date: (a, b) => a.mtime - b.mtime,
  size: (a, b) => a.size - b.size,
  type: (a, b) => a.kind - b.kind || collator.compare(a.ext, b.ext),
  path: (a, b) => collator.compare(a.path, b.path),
};

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function selectItems(assets: Asset[], config: Config, folder: string | null, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = assets.filter((a) => {
    if (config.kind === "favorites" && !a.fav) return false;
    if (config.kind === "image" && a.kind !== 0 || config.kind === "video" && a.kind !== 1) return false;
    if (folder !== null && a.dir !== folder && !a.dir.startsWith(folder + "/")) return false;
    const path = a.path.toLowerCase();
    return terms.every((term) => path.includes(term));
  });
  const compare = sorters[config.sortKey];
  const direction = config.sortDir === "asc" ? 1 : -1;
  return list.sort((a, b) => direction * compare(a, b) || a.path.localeCompare(b.path));
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [facts, setFacts] = useState<Map<string, MediaFacts>>(() => new Map());
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [folder, setFolder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const [quitting, setQuitting] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const connected = snapshot !== null;
  const generation = useRef("");
  const saves = useRef<Promise<void>>(Promise.resolve());
  const saveSequence = useRef(0);
  const activeFavorites = useRef(new Set<string>());

  const adopt = useCallback((next: Snapshot) => {
    generation.current = next.generation;
    setSnapshot(next);
    setFacts(new Map());
    setError("");
    setFolder(null);
    setQuery("");
    setSelected(null);
  }, []);

  useEffect(() => {
    let live = true;
    const narrow = window.matchMedia("(max-width: 760px)");
    setSidebarOpen(!narrow.matches);
    void api.state().then(next => { if (live) adopt(next); }).catch(e => { if (live) setError(message(e)); });
    return () => { live = false; };
  }, [adopt]);

  const currentGeneration = snapshot?.generation;
  const phase = snapshot?.scan.phase;
  useEffect(() => {
    if (!currentGeneration || phase !== "discover") return;
    let live = true;
    let timer = 0;
    const apply = (next: Snapshot, includeAssets: boolean) => {
      if (live && next.generation === currentGeneration && next.generation === generation.current) {
        setSnapshot(s => s ? { ...s, scan: next.scan, assets: includeAssets ? next.assets : s.assets } : s);
      }
    };
    const poll = async () => {
      try {
        const state = await api.status();
        if (!live || state.generation !== currentGeneration) return;
        if (state.scan.phase === "discover") {
          apply(state, false);
          timer = window.setTimeout(poll, 250);
        } else {
          apply(await api.state(), true);
        }
      } catch (e) {
        if (live) setError(message(e));
      }
    };
    timer = window.setTimeout(poll, 100);
    return () => { live = false; window.clearTimeout(timer); };
  }, [currentGeneration, phase]);

  useEffect(() => {
    if (!connected || quitting) return;
    const ping = () => { void api.ping().catch(() => {}); };
    const timer = window.setInterval(ping, 5000);
    return () => window.clearInterval(timer);
  }, [connected, quitting]);

  useEffect(() => {
    if (!snapshot?.config.theme) return;
    const theme = snapshot.config.theme;
    const system = window.matchMedia("(prefers-color-scheme: light)");
    const set = () => {
      const light = theme === "light" || theme === "system" && system.matches;
      document.documentElement.classList.toggle("bb-light", light);
      document.documentElement.style.colorScheme = light ? "light" : "dark";
    };
    set();
    system.addEventListener("change", set);
    return () => system.removeEventListener("change", set);
  }, [snapshot?.config.theme]);

  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey ||
        (e.target instanceof HTMLElement && e.target.closest("input,select,textarea,[contenteditable=true],[role=dialog],dialog"))) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const refresh = async () => {
    if (!currentGeneration || phase === "discover") return;
    setError("");
    try {
      await api.refresh(currentGeneration);
      if (currentGeneration === generation.current) {
        setSnapshot(s => s ? { ...s, scan: { phase: "discover", found: 0 } } : s);
      }
    } catch (e) {
      if (currentGeneration === generation.current) setError(message(e));
    }
  };

  const update = (patch: Partial<Config>) => {
    if (!currentGeneration) return;
    const change = ++saveSequence.current;
    setSnapshot(s => s ? { ...s, config: { ...s.config, ...patch } } : s);
    saves.current = saves.current.then(async () => {
      if (currentGeneration !== generation.current) return;
      try {
        const config = await api.config(currentGeneration, patch);
        if (currentGeneration === generation.current && change === saveSequence.current) {
          setSnapshot(s => s ? { ...s, config } : s);
        }
      } catch (e) {
        if (currentGeneration !== generation.current) return;
        setError("Could not save preferences. " + message(e));
        if (change === saveSequence.current) {
          const state = await api.status().catch(() => null);
          if (state?.generation === generation.current && change === saveSequence.current) {
            setSnapshot(s => s ? { ...s, config: state.config } : s);
          }
        }
      }
    });
  };

  const favorite = useCallback(async (asset: Asset) => {
    const key = assetKey(asset);
    if (generation.current !== asset.generation || activeFavorites.current.has(key)) return;
    activeFavorites.current.add(key);
    try {
      await api.favorite(asset);
      if (generation.current === asset.generation) {
        setSnapshot(s => s ? { ...s, assets: s.assets?.map(a => a.id === asset.id ? { ...a, fav: !asset.fav } : a) } : s);
      }
    } catch (e) {
      if (generation.current === asset.generation) setError("Could not save favorite. " + message(e));
    } finally {
      activeFavorites.current.delete(key);
    }
  }, []);

  const onFacts = useCallback((asset: Asset, info: MediaFacts) => {
    if (generation.current !== asset.generation) return;
    const key = assetKey(asset);
    setFacts(previous => {
      const old = previous.get(key);
      if (old?.w === info.w && old?.h === info.h && old?.dur === info.dur) return previous;
      const next = new Map(previous);
      if (next.size >= 512 && !old) next.delete(next.keys().next().value!);
      next.set(key, info);
      return next;
    });
  }, []);

  const rawAssets = snapshot?.assets;
  const indexedAssets = useMemo<Asset[]>(() => (rawAssets ?? []).map(a => {
    const slash = a.path.lastIndexOf("/");
    const name = a.path.slice(slash + 1);
    return { ...a, generation: currentGeneration!, name, dir: a.path.slice(0, Math.max(0, slash)),
      ext: name.slice(name.lastIndexOf(".") + 1).toLowerCase(), w: 0, h: 0, dur: 0 };
  }), [rawAssets, currentGeneration]);
  const cfg = snapshot?.config;
  const matching = useMemo(() => cfg ? selectItems(indexedAssets, cfg, folder, deferredQuery) : [],
    [indexedAssets, cfg?.kind, cfg?.sortKey, cfg?.sortDir, folder, deferredQuery]);
  const items = useMemo(() => matching.map(a => {
    const info = facts.get(assetKey(a));
    return info ? { ...a, ...info } : a;
  }), [matching, facts]);
  const index = selected === null ? -1 : items.findIndex(a => a.id === selected);
  const active = index < 0 ? null : items[index];
  useEffect(() => {
    if (selected && !active) setSelected(null);
  }, [active, selected]);

  const open = async (path: string) => {
    await saves.current;
    const response = await api.open(generation.current, path);
    adopt(response);
    setPicker(false);
  };
  const pickSubfolder = (path: string | null) => {
    setFolder(path);
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  };
  const quit = async () => {
    try {
      await saves.current;
      await api.quit();
      setQuitting(true);
      window.close();
    } catch (e) {
      setError(message(e));
    }
  };

  if (!snapshot || !cfg || quitting) {
    return <AppFrame><div className="empty" role="status">{quitting ? "Local Media Gallery has closed." : error || "Opening Local Media Gallery…"}</div></AppFrame>;
  }

  const rootName = snapshot.root.split(/[\\/]/).filter(Boolean).at(-1) || snapshot.root;
  const scanError = snapshot.scan.error;
  const scanning = phase === "discover";
  const status = scanning
    ? (snapshot.scan.found ? ("Finding media · " + snapshot.scan.found.toLocaleString()) : "Finding media…")
    : scanError ? (phase === "closed" ? "Could not open folder" : "Scan incomplete") : "";
  const settings = <>
    <Field id="portable-theme" label="Theme" control={
      <FormControls.Select value={cfg.theme} onChange={e => update({ theme: e.target.value as Config["theme"] })}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </FormControls.Select>
    } />
    <label className="check-line"><FormControls.Checkbox checked={cfg.showNames} onChange={e => update({ showNames: e.target.checked })} /> Show file names on cards</label>
    <Field id="portable-fit" label="Grid image fit" control={
      <FormControls.Select value={cfg.fit} onChange={e => update({ fit: e.target.value as Config["fit"] })}>
        <option value="cover">Fill tile</option><option value="contain">Fit inside tile</option>
      </FormControls.Select>
    } />
    <Button variant="secondary" onClick={() => void quit()}>Quit Local Media Gallery</Button>
  </>;
  const toolbar = <Toolbar cfg={cfg} update={update} query={query} setQuery={setQuery} searchRef={search}
    shown={items.length} total={indexedAssets.length} scanning={scanning} root={snapshot.root}
    sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(value => !value)}
    onOpenFolder={() => setPicker(true)} onRefresh={() => void refresh()} settings={settings}
    status={status} problem={error || scanError} dismiss={error ? () => setError("") : undefined} />;

  return <AppFrame host="browser" layout="full-bleed" header={toolbar}>
    <div className="main">
      {sidebarOpen && <>
        <button type="button" className="side-scrim" tabIndex={-1} aria-hidden="true" onClick={() => setSidebarOpen(false)} />
        <Sidebar key={currentGeneration} assets={indexedAssets} folder={folder} rootName={rootName} onSelect={pickSubfolder} />
      </>}
      <div className="content" aria-label="Media gallery">
        {items.length ? <GalleryView items={items} cfg={cfg} resetKey={[currentGeneration, folder, deferredQuery, cfg.kind, cfg.view].join(":")}
          onOpen={setSelected} onToggleFav={favorite} onFacts={onFacts} /> :
          <div className="empty">
            <h2>{scanning ? "Finding media…" : phase === "closed" ? "Open a media folder"
              : indexedAssets.length > 0 ? "Nothing matches" : phase === "error" ? "Folder scan incomplete" : "No photos or videos found"}</h2>
            {!scanning && <p>{indexedAssets.length > 0 ? "Try a different search, filter, or folder."
              : phase === "ready" ? "Add media to this folder and refresh." : "Choose a folder or check its permissions."}</p>}
          </div>}
      </div>
    </div>
    {picker && <FolderDialog root={snapshot.root} onOpen={open} onClose={() => setPicker(false)} />}
    {active && <Viewer asset={active} position={index + 1} count={items.length}
      previous={index > 0 ? () => setSelected(items[index - 1].id) : undefined}
      next={index < items.length - 1 ? () => setSelected(items[index + 1].id) : undefined}
      close={() => setSelected(null)} favorite={favorite} facts={onFacts} />}
  </AppFrame>;
}
