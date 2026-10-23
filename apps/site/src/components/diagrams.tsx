// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect } from 'react';
// The SVG itself is static. Center wide diagrams on their first reading viewport.
export function DiagramTools() {
  useEffect(() => {
    let disposed = false;
    document.fonts.ready.then(() => {
      if (disposed) return;
      for (const figure of document.querySelectorAll<HTMLElement>('.diagram-output'))
        figure.scrollLeft = Math.max(0, (figure.scrollWidth - figure.clientWidth) / 2);
    });
    return () => {
      disposed = true;
    };
  }, []);
  return null;
}
