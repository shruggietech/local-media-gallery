// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from 'next';
import '@brand/tokens/interface.css';
import '@brand/tokens/spacing.css';
import '@brand/web/components.css';
import './gallery.css';

export const metadata: Metadata = { title: 'Local Media Gallery', description: 'A lightweight, interactive gallery for browsing local images and videos.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="stylesheet" href="/brand/fonts/fonts.css" /></head><body>{children}</body></html>;
}
