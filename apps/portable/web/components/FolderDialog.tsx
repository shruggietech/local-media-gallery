// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, FormControls } from "@brand/web/react/server";
import { api } from "@/lib/api";

export default function FolderDialog({ root, onOpen, onClose }: {
  root: string; onOpen: (path: string) => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [path, setPath] = useState(root);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  const choose = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api.pick();
      if (result.path) setPath(result.path);
    } catch (e) {
      setError("The native picker is unavailable. Enter a folder path.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !path) return;
    setBusy(true);
    setError("");
    try {
      await onOpen(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return <dialog ref={dialog} className="bb-dialog folder-dialog" aria-labelledby="folder-title"
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <h2 id="folder-title">Open folder</h2>
      <Field id="folder-path" label="Folder path" control={
        <FormControls.TextInput value={path} onChange={e => setPath(e.target.value)} autoFocus />
      } />
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={() => void choose()} disabled={busy}>Browse…</Button>
        <div className="spacer" />
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy || !path}>Open</Button>
      </div>
    </form>
  </dialog>;
}
