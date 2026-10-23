// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect } from 'react';

export function Diagrams() {
  useEffect(() => {
    let retired = false;
    async function render() {
      const figures = Array.from(document.querySelectorAll<HTMLElement>('.diagram'));
      if (!figures.length) return;
      const mermaid = (await import('mermaid')).default;
      const style = getComputedStyle(document.documentElement);
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: style.getPropertyValue('--bb-typography-body-family'), themeVariables: { primaryColor: style.getPropertyValue('--bb-surface-card').trim(), primaryTextColor: style.getPropertyValue('--bb-text-primary').trim(), primaryBorderColor: style.getPropertyValue('--bb-focus-ring').trim(), lineColor: style.getPropertyValue('--bb-text-primary').trim(), background: style.getPropertyValue('--bb-surface-background').trim() } });
      for (const [index, figure] of figures.entries()) {
        if (retired) return;
        const target = figure.querySelector<HTMLElement>('.diagram-output')!;
        try { const result = await mermaid.render(`docs-diagram-${index}`, figure.querySelector('.mermaid-source')!.textContent!); if (!retired) { target.innerHTML = result.svg; target.setAttribute('data-rendered', 'true'); } }
        catch { if (!retired) { target.textContent = 'Diagram rendering unavailable. Read the source below.'; figure.querySelector('details')!.open = true; } }
      }
    }
    void render(); return () => { retired = true; };
  }, []);
  return null;
}
