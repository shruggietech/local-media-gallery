// SPDX-License-Identifier: Apache-2.0
import type { MetadataRoute } from 'next';
import { origin } from '../lib/metadata';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/raw/', '/search/', '/deployment.json'] },
    sitemap: origin + '/sitemap.xml',
  };
}

export const dynamic = 'force-static';
