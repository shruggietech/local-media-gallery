// SPDX-License-Identifier: Apache-2.0
import { notFound } from 'next/navigation';
import { model } from '../../lib/model';
import { aliasRoutes } from '../../lib/navigation.mjs';
import { routeMetadata } from '../../lib/metadata';
import { DocsControls } from '../../components/docs-controls';
import { ReadingShell } from '../../components/reading-shell';
import { CodeTools } from '../../components/code-tools';
import type { Root } from 'fumadocs-core/page-tree';
const aliases = aliasRoutes(model.manifest);
function resolve(requested: string) {
  return aliases.includes(requested)
    ? requested === '/docs/' || requested === '/docs/latest/'
      ? '/docs/' + model.manifest.latest + '/'
      : requested.replace('/docs/latest/', '/docs/' + model.manifest.latest + '/')
    : requested;
}
export function generateStaticParams() {
  return [...model.pages.map((page) => page.route), ...aliases].map((route) => ({
    route: route.split('/').filter(Boolean),
  }));
}
export async function generateMetadata({ params }: { params: Promise<{ route: string[] }> }) {
  const route = resolve('/' + (await params).route.join('/') + '/');
  const page = model.pages.find((page) => page.route === route);
  return routeMetadata(
    page?.title ?? 'Documentation',
    route,
    page?.version ? page.title + '. Local Media Gallery ' + page.version + ' documentation.' : undefined,
  );
}
export default async function Reference({ params }: { params: Promise<{ route: string[] }> }) {
  const requested = '/' + (await params).route.join('/') + '/';
  const route = resolve(requested);
  const page = model.pages.find((entry) => entry.route === route);
  if (!page) notFound();
  const snapshot = model.manifest.snapshots.find((entry) => entry.version === page.version);
  const body = (
    <>
      {requested !== route ? (
        <p className="alias-note">
          Documentation entry for {model.manifest.latest}. <a href={route}>Open the explicit version URL</a>.
        </p>
      ) : null}
      <a className="raw-link" href={page.raw}>
        Read raw source ↗
      </a>
      <div className="source-content" dangerouslySetInnerHTML={{ __html: page.html }} />
    </>
  );
  if (!snapshot)
    return (
      <article className="reference-layout prose">
        {body}
        <CodeTools />
      </article>
    );
  const topics = [...snapshot.topics, ...(snapshot.schema ? ['schema'] : [])];
  const tree: Root = {
    name: 'Documentation',
    children: topics.map((topic) => {
      const entry = model.pages.find((p) => p.version === snapshot.version && p.topic === topic)!;
      return { type: 'page', name: entry.title, url: entry.route };
    }),
  };
  const toc = (page.headings ?? [])
    .filter((h) => h.level === 2 || h.level === 3)
    .map((h) => ({ title: h.title, url: '#' + h.id, depth: h.level }));
  const controls = (
    <>
      <p className="version-label">
        {snapshot.version} ·{' '}
        {snapshot.status === 'specification' ? 'Specification baseline' : 'Released documentation'}
      </p>
      <DocsControls
        version={snapshot.version}
        topic={page.topic!}
        snapshots={model.manifest.snapshots.map((entry) => ({
          ...entry,
          topics: [...entry.topics, ...(entry.schema ? ['schema'] : [])],
        }))}
      />
    </>
  );
  return (
    <ReadingShell tree={tree} toc={toc} controls={controls}>
      {body}
    </ReadingShell>
  );
}
