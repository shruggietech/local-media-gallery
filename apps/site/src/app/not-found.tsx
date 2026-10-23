// SPDX-License-Identifier: Apache-2.0
import { routeMetadata } from '../lib/metadata';
export const metadata = routeMetadata(
  'Page not found',
  '/404.html',
  'This page is unavailable. Browse the Local Media Gallery documentation or return home.',
);
export default function NotFound() {
  return (
    <article className="reference-layout prose">
      <h1>Page not found</h1>
      <p>
        This address is unavailable. <a href="/docs/">Browse the documentation</a> or{' '}
        <a href="/">return home</a>.
      </p>
    </article>
  );
}
