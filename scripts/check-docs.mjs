// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chapters = new Map([
  ['overview.md', 'OV'], ['architecture.md', 'AR'],
  ['installation-and-distribution.md', 'DI'], ['gallery-lifecycle.md', 'GL'],
  ['browsing-and-playback.md', 'BP'], ['metadata-and-sidecars.md', 'MD'],
  ['configuration-and-state.md', 'CS'], ['interfaces-and-contracts.md', 'IF'],
  ['thumbnails-and-performance.md', 'PF'], ['security-and-reliability.md', 'SR'],
  ['website-and-documentation.md', 'WD'], ['verification-and-compatibility.md', 'VC'],
]);
const expected = ['index.md', ...chapters.keys(), 'glossary.md', 'brand.md'];

// This checker validates the project's authored Markdown conventions and links.
// It is not a Markdown renderer or a Mermaid syntax/rendering validator.
function inspectMarkdown(source, label) {
  const lines = source.split('\n');
  const headings = new Set(); const duplicateCounts = new Map();
  const prose = []; let fence = null; let body = []; let diagrams = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const marker = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (marker && !fence) {
      assert.ok(marker[2].trim(), `${label}:${i + 1}: code fence needs a language`);
      fence = { char: marker[1][0], length: marker[1].length, language: marker[2].trim() };
      body = []; continue;
    }
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) {
        if (fence.language === 'json') JSON.parse(body.join('\n'));
        if (fence.language === 'mermaid') {
          assert.match(body.find((entry) => entry.trim()) ?? '', /^flowchart (TB|TD)$/, `${label}: flowcharts must be top-down`);
          diagrams += 1;
        }
        fence = null;
      } else body.push(line);
      continue;
    }
    prose.push(line);
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (!heading) continue;
    assert.ok(i === 0 || lines[i - 1] === '', `${label}:${i + 1}: blank line required before heading`);
    assert.equal(lines[i + 1], '', `${label}:${i + 1}: blank line required after heading`);
    const base = heading[2].replace(/`/g, '').toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-');
    const count = duplicateCounts.get(base) ?? 0;
    duplicateCounts.set(base, count + 1);
    headings.add(count ? `${base}-${count}` : base);
  }
  assert.equal(fence, null, `${label}: unterminated code fence`);
  return { headings, prose: prose.join('\n'), diagrams };
}

const docsRoot = join(root, 'docs');
const versions = (await readdir(docsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^v\d+\.\d+\.\d+$/.test(entry.name));
assert.ok(versions.length, 'No versioned documentation');
const targets = new Map(); let links = 0; let totalRequirements = 0; let totalDiagrams = 0;
for (const version of versions) {
  const directory = join(docsRoot, version.name);
  const names = (await readdir(directory)).filter((name) => extname(name) === '.md');
  if (version.name === 'v0.0.0') assert.deepEqual(names.sort(), [...expected].sort(), 'Approved baseline chapter set differs');
  const records = new Map(); const requirements = new Set(); const decisions = new Set();
  for (const name of names) {
    const file = join(directory, name); const source = await readFile(file, 'utf8');
    const record = inspectMarkdown(source, `${version.name}/${name}`);
    assert.equal((record.prose.match(/^# /gm) ?? []).length, 1, `${name}: expected one H1`);
    assert.ok(!/[\u2013\u2014]/u.test(source), `${name}: use plain punctuation`);
    assert.ok(!/\b(?:GalleryGen|MakeIndex|insonic|S\d{3})\b/.test(record.prose), `${name}: private inspiration or tracking identifier in public docs`);
    assert.ok(!/\[(?:NEEDS CLARIFICATION|FEATURE NAME|DATE)\]/.test(source), `${name}: unresolved template token`);
    for (const match of record.prose.matchAll(/\*\*([A-Z]{2}-\d{2}):\*\*/g)) {
      assert.ok(!requirements.has(match[1]), `Duplicate requirement ${match[1]}`);
      requirements.add(match[1]);
    }
    if (name === 'index.md') for (const match of record.prose.matchAll(/^\| (U-\d{2}) \|/gm)) decisions.add(match[1]);
    records.set(name, { ...record, file, source }); targets.set(file, record);
    totalDiagrams += record.diagrams;
  }
  const index = records.get('index.md');
  assert.ok(index, `${version.name}: documentation index missing`);
  if (version.name === 'v0.0.0') {
    assert.equal(decisions.size, 13, 'Expected the thirteen explicit open-decision groups');
    for (const [name, prefix] of chapters) {
      assert.ok(index.prose.includes(`](${name})`), `Index does not list ${name}`);
      assert.ok(records.get(name).headings.has('open-decisions') || name === 'verification-and-compatibility.md', `${name}: missing open-decision section`);
      assert.ok([...records.get(name).prose.matchAll(/\*\*([A-Z]{2}-\d{2}):\*\*/g)].some((match) => match[1].startsWith(`${prefix}-`)), `${name}: no requirements with its assigned prefix`);
      assert.ok(records.get('verification-and-compatibility.md').prose.includes(`${prefix}-01`), `Acceptance matrix omits ${prefix}`);
    }
  }
  for (const record of records.values()) {
    for (const match of record.prose.matchAll(/\bU-\d{2}\b/g)) assert.ok(decisions.has(match[0]), `Unregistered decision ${match[0]} in ${record.file}`);
    for (const match of record.prose.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      const href = match[1]; if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      const hash = href.indexOf('#');
      const filePart = decodeURIComponent(hash < 0 ? href : href.slice(0, hash));
      const fragment = hash < 0 ? '' : decodeURIComponent(href.slice(hash + 1));
      const target = filePart ? resolve(dirname(record.file), filePart) : record.file;
      const scoped = relative(root, target).replaceAll('\\', '/');
      assert.ok(!scoped.startsWith('../') && !scoped.startsWith('specs/'), `Public link escapes source scope: ${href}`);
      await access(target);
      if (fragment && extname(target) === '.md') {
        let targetRecord = targets.get(target);
        if (!targetRecord) {
          targetRecord = inspectMarkdown(await readFile(target, 'utf8'), scoped);
          targets.set(target, targetRecord);
        }
        assert.ok(targetRecord.headings.has(fragment), `Missing fragment ${href} in ${record.file}`);
      }
      links += 1;
    }
  }
  totalRequirements += requirements.size;
}
console.log(`Documentation checks passed: ${versions.length} version(s), ${expected.length} baseline documents, ${totalRequirements} requirement definitions, ${links} local links/fragments, ${totalDiagrams} top-down diagram blocks.`);
