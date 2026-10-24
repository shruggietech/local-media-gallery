// SPDX-License-Identifier: Apache-2.0
'use client';
import { useCallback, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SaveDestination, SettingField, SettingsEnvelope, SettingsPatch, ViewSettings } from './types';

export const defaults: ViewSettings = { version: '0.0.0', formatVersion: 1, fontScale: 100, pageSize: 48, cardSize: 'medium', controlsExpanded: false, scrollIndicator: 'auto', metadataExpanded: false, filter: 'all', sort: 'name', direction: 'asc' };
const message = (error: unknown) => typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error);
export function useGalleryState() {
  const [settings, setSettings] = useState(defaults);
  const [envelope, setEnvelope] = useState<SettingsEnvelope | null>(null);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState('');
  const [destination, setDestination] = useState<SaveDestination>('user');
  const scope = useRef<{ id: string | null | undefined; generation: number; envelope: SettingsEnvelope | null }>({ id: undefined, generation: 0, envelope: null });
  const queue = useRef(Promise.resolve());
  const pending = useRef<{ token: object; patch: SettingsPatch; order: number }[]>([]);
  const sequence = useRef(0);
  const destinationRef = useRef<SaveDestination>('user');
  const accept = useCallback((value: SettingsEnvelope, generation: number) => {
    if (scope.current.generation !== generation || value.sessionId !== scope.current.id) return;
    scope.current.envelope = value;
    const temporary = Object.assign({}, ...pending.current.map(p => p.patch)) as SettingsPatch;
    const sources = { ...value.sources }; const savedTo = { ...value.savedTo };
    for (const field of Object.keys(temporary) as SettingField[]) { sources[field] = 'session'; delete savedTo[field]; }
    setEnvelope({ ...value, sources, savedTo, layers: { ...value.layers, session: { ...value.layers.session, ...temporary } } });
    setSettings({ ...value.settings, ...temporary });
    setWarning(value.warning || ''); setReady(true);
  }, []);
  const activate = useCallback((id: string | null) => {
    if (scope.current.id === id) return;
    const generation = scope.current.generation + 1;
    scope.current = { id, generation, envelope: null }; pending.current = [];
    destinationRef.current = 'user'; setDestination('user'); setReady(false); setWarning(''); setEnvelope(null); setSettings(defaults);
    queue.current = invoke<SettingsEnvelope>('load_settings', { sessionId: id }).then(value => accept(value, generation)).catch(error => {
      if (scope.current.generation === generation) setWarning('Presentation state could not be loaded: ' + message(error));
    });
  }, [accept]);
  const selectDestination = useCallback((value: SaveDestination) => { destinationRef.current = value; setDestination(value); }, []);
  const mutate = useCallback((patch: SettingsPatch, remove: SettingField | null = null, clear = false, target = destinationRef.current) => {
    const { id, generation } = scope.current;
    if (id === undefined) return;
    const token = {}; const order = ++sequence.current; pending.current.push({ token, patch, order });
    if (scope.current.envelope) accept(scope.current.envelope, generation);
    queue.current = queue.current.then(async () => {
      if (scope.current.generation !== generation) return;
      const current = scope.current.envelope; if (!current) return;
      try {
        const value = await invoke<SettingsEnvelope>('save_settings', { request: { sessionId: id, expectedRevision: current.revision, destination: target, patch, remove, clear } });
        if (scope.current.generation !== generation) return;
        pending.current = pending.current.flatMap(p => {
          if (p.token === token) return [];
          if (p.order > order) return [p];
          const remaining = { ...p.patch };
          for (const field of (clear ? Object.keys(remaining) : [...Object.keys(patch), ...(remove ? [remove] : [])]) as SettingField[]) delete remaining[field];
          return Object.keys(remaining).length ? [{ ...p, patch: remaining }] : [];
        }); accept(value, generation);
      } catch (error) { if (scope.current.generation === generation) { if (scope.current.envelope) accept(scope.current.envelope, generation); setWarning('The change remains temporary: ' + message(error)); } }
    });
  }, [accept]);
  const forget = useCallback((id: string | null) => {
    const { id: sessionId, generation } = scope.current;
    queue.current = queue.current.then(async () => {
      const current = scope.current.envelope;
      if (scope.current.generation !== generation || !current) return;
      try { accept(await invoke<SettingsEnvelope>('forget_history', { sessionId, expectedRevision: current.revision, id }), generation); }
      catch (error) { if (scope.current.generation === generation) setWarning('History could not be changed: ' + message(error)); }
    });
  }, [accept]);
  return { settings, envelope, ready, warning, destination, selectDestination, activate, change: mutate, remove: (field: SettingField, target: 'remembered' | 'portable') => mutate({}, field, false, target), clear: () => mutate({}, null, true, 'session'), forget };
}
