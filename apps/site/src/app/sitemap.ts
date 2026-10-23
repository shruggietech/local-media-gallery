// SPDX-License-Identifier: Apache-2.0
import type { MetadataRoute } from 'next';
import { model } from '../lib/model';
import { origin } from '../lib/metadata';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', ...model.pages.map((page) => page.route)].map((route) => ({ url: origin + route }));
}

export const dynamic = 'force-static';
