// SPDX-License-Identifier: Apache-2.0
/** @param {string} version @param {string} topic */
export const topicRoute = (version, topic) => `/docs/${version}/${topic === 'index' ? '' : `${topic}/`}`;

/** @param {{latest: string, snapshots: {version: string, topics: string[]}[]}} manifest */
export function aliasRoutes(manifest) {
  const selected = manifest.snapshots.find(snapshot => snapshot.version === manifest.latest);
  if (!selected) throw new Error('Unknown latest version');
  return ['/docs/', '/docs/latest/', ...selected.topics.filter(topic => topic !== 'index').map(topic => `/docs/latest/${topic}/`)];
}

/** @param {{latest: string, snapshots: {version: string, status: string, topics: string[]}[]}} manifest */
export function landingDocs(manifest) {
  const selected = manifest.snapshots.find(snapshot => snapshot.version === manifest.latest);
  if (!selected) throw new Error('Unknown latest version');
  return { version: selected.version, status: selected.status, overview: switchTopic(manifest.snapshots, selected.version, 'overview').href };
}

/** @param {{ version: string, topics: string[] }[]} versions @param {string} version @param {string} topic */
export function switchTopic(versions, version, topic) {
  const snapshot = versions.find(entry => entry.version === version);
  if (!snapshot) throw new Error('Unknown version');
  const missing = !snapshot.topics.includes(topic);
  return { href: topicRoute(version, missing ? 'index' : topic) + (missing ? `?missing=${encodeURIComponent(topic)}` : ''), missing };
}

/** @template {{ version: string, title: string, text: string }} T @param {T[]} entries @param {string} query @param {string} version */
export function searchEntries(entries, query, version) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries.filter(entry => entry.version === version && words.every(word => `${entry.title} ${entry.text}`.toLocaleLowerCase().includes(word))).slice(0, 20);
}
