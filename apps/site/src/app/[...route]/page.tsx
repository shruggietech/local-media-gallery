// SPDX-License-Identifier: Apache-2.0
import { notFound } from 'next/navigation';
import { model } from '../../lib/model';
import { DocsControls } from '../../components/docs-controls';
import { Diagrams } from '../../components/diagrams';
import { aliasRoutes } from '../../lib/navigation.mjs';

export const dynamicParams = false;
const aliases = aliasRoutes(model.manifest);
export function generateStaticParams() { return [...model.pages.map(page => page.route), ...aliases].map(route => ({ route: route.split('/').filter(Boolean) })); }
export async function generateMetadata({ params }: { params: Promise<{ route: string[] }> }) { const route = '/' + (await params).route.join('/') + '/'; return { title: model.pages.find(page => page.route === route)?.title ?? 'Documentation' }; }
export default async function Reference({ params }: { params: Promise<{ route: string[] }> }) {
  const requested = '/' + (await params).route.join('/') + '/';
  const alias = aliases.includes(requested);
  const route = alias ? requested === '/docs/' || requested === '/docs/latest/' ? `/docs/${model.manifest.latest}/` : requested.replace('/docs/latest/', `/docs/${model.manifest.latest}/`) : requested;
  const page = model.pages.find(entry => entry.route === route); if (!page) notFound();
  const snapshot = model.manifest.snapshots.find(entry => entry.version === page.version);
  return <div className={snapshot ? 'docs-layout' : 'reference-layout'}>{snapshot ? <aside><p className="version-label">{snapshot.version} · {snapshot.status === 'specification' ? 'Specification baseline' : 'Released documentation'}</p><DocsControls version={snapshot.version} topic={page.topic!} snapshots={model.manifest.snapshots.map(entry => ({ ...entry, topics: [...entry.topics, ...(entry.schema ? ['schema'] : [])] }))} /><nav aria-label="Chapters"><ol>{snapshot.topics.map(topic => <li key={topic}><a href={`/docs/${snapshot.version}/${topic === 'index' ? '' : `${topic}/`}`} aria-current={topic === page.topic ? 'page' : undefined}>{model.pages.find(entry => entry.version === snapshot.version && entry.topic === topic)?.title}</a></li>)}</ol>{snapshot.schema ? <a href={`/docs/${snapshot.version}/schema/`}>Application JSON Schema</a> : null}</nav></aside> : null}<article className="prose">{alias ? <p className="alias-note">Documentation entry for {model.manifest.latest}. <a href={route}>Open the explicit version URL</a>.</p> : null}<a className="raw-link" href={page.raw}>Read raw source</a><div dangerouslySetInnerHTML={{ __html: page.html }} /><Diagrams /></article></div>;
}
