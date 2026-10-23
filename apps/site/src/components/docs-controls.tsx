// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect, useState } from 'react';
import { Field, TextInput, FormControls } from '@brand/web/react/server';
import { switchTopic, searchEntries } from '../lib/navigation.mjs';

type Snapshot = { version: string; topics: string[]; status: string };
type Entry = { version: string; title: string; text: string; href: string };
export function DocsControls({ version, topic, snapshots }: { version: string; topic: string; snapshots: Snapshot[] }) {
  const [query, setQuery] = useState(''); const [entries, setEntries] = useState<Entry[]>([]); const [error, setError] = useState(''); const [fallback, setFallback] = useState('');
  useEffect(() => {
    const missing = new URLSearchParams(window.location.search).get('missing');
    if (missing) setFallback(`The topic “${missing}” is unavailable in ${version}. This is the selected version’s index.`);
    const controller = new AbortController();
    fetch(`/search/${version}.json`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Search index unavailable'); return response.json(); }).then(setEntries).catch(reason => { if (reason.name !== 'AbortError') setError('Search is unavailable. Use chapter navigation below.'); });
    return () => controller.abort();
  }, [version]);
  const results = searchEntries(entries, query, version);
  return <section className="docs-controls" aria-label="Documentation tools">{fallback ? <p role="status">{fallback}</p> : null}<Field id="docs-version" label="Documentation version" control={<FormControls.Select value={version} onChange={event => { window.location.assign(switchTopic(snapshots, event.target.value, topic).href); }}>{snapshots.map(snapshot => <option key={snapshot.version} value={snapshot.version}>{snapshot.version} ({snapshot.status})</option>)}</FormControls.Select>} /><Field id="docs-search" label={`Search ${version}`} control={<TextInput type="search" value={query} onChange={event => setQuery(event.target.value)} />} />{error ? <p role="status">{error}</p> : null}{query.trim() ? <div aria-live="polite"><p>{results.length} results in {version}</p><ul>{results.map(entry => <li key={entry.href}><a href={entry.href}>{entry.title} ({entry.version})</a></li>)}</ul></div> : null}</section>;
}
