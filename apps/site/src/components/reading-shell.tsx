// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect, useRef, useState, type ComponentProps, type CSSProperties } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import type { Root } from 'fumadocs-core/page-tree';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DiagramTools } from './diagrams';
import { CodeTools } from './code-tools';

function AccessibleSidebar(props: SidebarProps) {
  const { open, setOpen, mode } = useSidebar();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element || mode !== 'drawer') return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open, mode]);
  if (mode !== 'drawer') return <Sidebar {...props} />;
  // Native modal behavior owns focus containment, Escape and background inertness.
  return (
    <dialog
      ref={dialog}
      className="mobile-docs-dialog"
      aria-label="Documentation navigation"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], select, input, [tabindex="0"]'),
        ).filter(
          (element) =>
            !element.hasAttribute('disabled') &&
            getComputedStyle(element).visibility !== 'hidden' &&
            element.getClientRects().length,
        );
        const first = items[0],
          last = items.at(-1),
          current = document.activeElement;
        if (
          current === event.currentTarget ||
          (event.shiftKey && current === first) ||
          (!event.shiftKey && current === last)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      onCancel={() => setOpen(false)}
      onClose={() => setOpen(false)}
    >
      <Sidebar {...props} />
    </dialog>
  );
}

function ReadingToc({ items, compact = false }: { items: TOCItemType[]; compact?: boolean }) {
  const [active, setActive] = useState(items[0]?.url ?? '');
  const list = useRef<HTMLOListElement>(null);
  const [marker, setMarker] = useState({ top: 0, height: 0 });
  useEffect(() => {
    const scroll = document.querySelector<HTMLElement>('.bb-app-frame__scroll');
    if (!scroll) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = scroll.getBoundingClientRect().top + 110;
        let current = items[0]?.url ?? '';
        for (const item of items) {
          const heading = document.getElementById(item.url.slice(1));
          if (heading && heading.getBoundingClientRect().top <= top) current = item.url;
        }
        const article = document.querySelector('.source-content');
        if (article && article.getBoundingClientRect().bottom <= scroll.getBoundingClientRect().bottom + 1)
          current = items.at(-1)?.url ?? current;
        setActive(current);
      });
    };
    update();
    scroll.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      scroll.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items]);
  useEffect(() => {
    const link = list.current?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!link || !list.current) return;
    setMarker({ top: link.offsetTop, height: link.offsetHeight });
    const container = list.current.parentElement!;
    if (
      link.offsetTop < container.scrollTop ||
      link.offsetTop + link.offsetHeight > container.scrollTop + container.clientHeight
    )
      container.scrollTo({
        top: Math.max(0, link.offsetTop - container.clientHeight / 2),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
  }, [active]);
  const links = (
    <nav aria-label={compact ? 'Page contents compact' : 'Page contents'}>
      <ol ref={list}>
        <li className="toc-marker" aria-hidden="true" style={{ top: marker.top, height: marker.height }} />
        {items.map((item) => (
          <li key={item.url} data-depth={item.depth}>
            <a
              href={item.url}
              aria-current={active === item.url ? 'location' : undefined}
              onClick={(event) => {
                if (compact) event.currentTarget.closest('details')?.removeAttribute('open');
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
  if (!items.length) return null;
  return compact ? (
    <details className="compact-toc">
      <summary>On this page</summary>
      {links}
    </details>
  ) : (
    <aside className="reading-toc">
      <p>On this page</p>
      {links}
    </aside>
  );
}
function ReadingArticle(props: ComponentProps<'article'>) {
  return <article {...props} id="nd-page" className="reading-article" />;
}
export function ReadingShell({
  tree,
  toc,
  controls,
  children,
}: {
  tree: Root;
  toc: TOCItemType[];
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        slots={{
          sidebar: {
            provider: SidebarProvider,
            root: AccessibleSidebar,
            trigger: SidebarTrigger,
            useSidebar,
          },
        }}
        tree={tree}
        tabs={false}
        searchToggle={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        nav={{ title: 'Documentation', transparentMode: 'none' }}
        sidebar={{ collapsible: false, prefetch: false, banner: controls }}
        containerProps={{
          className: 'documentation-shell',
          style: { '--fd-docs-height': 'var(--site-scroll-height, calc(100dvh - 5rem))' } as CSSProperties,
        }}
      >
        <DocsPage
          slots={{ container: ReadingArticle }}
          toc={toc}
          breadcrumb={{ enabled: false }}
          footer={{ enabled: false }}
          tableOfContent={{ single: true, component: <ReadingToc items={toc} /> }}
          tableOfContentPopover={{ component: <ReadingToc items={toc} compact /> }}
        >
          <DocsBody>{children}</DocsBody>
          <CodeTools />
          <DiagramTools />
        </DocsPage>
      </DocsLayout>
    </RootProvider>
  );
}
