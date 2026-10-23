// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
export default {
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
  trailingSlash: true,
  experimental: { externalDir: true },
  turbopack: { root: path.resolve(directory, '../..') },
};
