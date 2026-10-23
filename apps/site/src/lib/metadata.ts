// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from 'next';
export const origin = 'https://localmedia.gallery';
export const description = 'A lightweight, interactive gallery for browsing local images and videos.';
export function routeMetadata(title: string, route: string, summary = description): Metadata {
  return {
    title,
    description: summary,
    alternates: { canonical: origin + route },
    openGraph: {
      type: 'website',
      siteName: 'Local Media Gallery',
      title,
      description: summary,
      url: origin + route,
      images: [
        {
          url: origin + '/social-preview.png',
          width: 1280,
          height: 640,
          alt: 'Local Media Gallery, your media presented beautifully.',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: summary,
      images: [origin + '/social-preview.png'],
    },
  };
}
