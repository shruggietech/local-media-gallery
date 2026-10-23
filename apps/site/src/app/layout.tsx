// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from 'next';
import { AppFrame } from '@brand/web/react/server';
import { SiteProvider, ThemeControl } from '../components/site-provider';
import { routeMetadata, origin, description } from '../lib/metadata';
import './site.css';
export const metadata: Metadata = {
  ...routeMetadata('Local Media Gallery', '/'),
  metadataBase: new URL('https://localmedia.gallery'),
  title: { default: 'Local Media Gallery', template: '%s | Local Media Gallery' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': origin + '/#website',
              name: 'Local Media Gallery',
              url: origin + '/',
              description,
            }).replaceAll('<', '\\u003c'),
          }}
        />
        <link rel="stylesheet" href="/brand/fonts/fonts.css" />
      </head>
      <body>
        <SiteProvider>
          <AppFrame
            host="browser"
            header={
              <header className="site-header">
                <a className="identity" href="/" aria-label="Local Media Gallery home">
                  <img
                    className="mark-dark"
                    src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-dark.svg"
                    alt=""
                    width="40"
                    height="40"
                  />
                  <img
                    className="mark-light"
                    src="/brand/logos/named/localmedia-gallery-brand-mark-reduced-detail-full-color-clear-for-light.svg"
                    alt=""
                    width="40"
                    height="40"
                  />
                  <span>Local Media Gallery</span>
                </a>
                <nav aria-label="Main navigation">
                  <a href="/docs/">Documentation</a>
                  <a href="/changelog/">Changelog</a>
                  <a href="/support/">Support</a>
                </nav>
                <ThemeControl />
              </header>
            }
          >
            {children}
            <footer className="site-footer">
              <a className="footer-title" href="/">
                Local Media Gallery
              </a>
              <p>A ShruggieTech project</p>
              <nav aria-label="Footer">
                <a href="/license/">Source license</a>
                <a href="/raw/v0.0.0/references/LICENSE-BRAND.md">Brand license</a>
                <a href="https://github.com/shruggietech/local-media-gallery">GitHub ↗</a>
              </nav>
            </footer>
          </AppFrame>
        </SiteProvider>
      </body>
    </html>
  );
}
