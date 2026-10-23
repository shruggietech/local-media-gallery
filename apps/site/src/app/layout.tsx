// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from 'next';
import { AppFrame } from '@brand/web/react/server';
import '@brand/tokens/interface.css';
import '@brand/tokens/spacing.css';
import '@brand/web/components.css';
import './site.css';

export const metadata: Metadata = { title: { default: 'Local Media Gallery', template: '%s | Local Media Gallery' }, description: 'A lightweight, interactive gallery for browsing local images and videos.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="/brand/fonts/fonts.css" /></head><body><AppFrame host="browser" header={<header className="site-header"><a className="identity" href="/" aria-label="Local Media Gallery home"><img src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg" alt="" width="48" height="48" /><span>Local Media Gallery</span></a><nav aria-label="Main navigation"><a href="/docs/">Documentation</a><a href="/changelog/">Changelog</a><a href="/support/">Support</a></nav></header>}>{children}<footer className="site-footer"><p>A ShruggieTech project</p><a href="/license/">Source license</a><a href="/raw/v0.0.0/references/LICENSE-BRAND.md">Brand license</a><a href="https://github.com/shruggietech/local-media-gallery">GitHub</a></footer></AppFrame></body></html>;
}
