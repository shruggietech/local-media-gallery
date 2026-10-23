// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect } from 'react';
export function CodeTools() {
  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-copy-code]'));
    const handles = buttons.map((button) => {
      button.hidden = false;
      const copy = async () => {
        const figure = button.closest('.code-example')!;
        const status = figure.querySelector<HTMLElement>('.copy-feedback')!;
        try {
          await navigator.clipboard.writeText(figure.querySelector('[data-code-source]')!.textContent ?? '');
          status.textContent = 'Copied to clipboard.';
        } catch {
          status.textContent = 'Copy failed. Select the code and copy it manually.';
        }
      };
      button.addEventListener('click', copy);
      return () => button.removeEventListener('click', copy);
    });
    return () => handles.forEach((dispose) => dispose());
  }, []);
  return null;
}
