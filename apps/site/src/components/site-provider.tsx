// SPDX-License-Identifier: Apache-2.0
'use client';
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
export function SiteProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const scroll = document.querySelector<HTMLElement>('.bb-app-frame__scroll');
    if (!scroll) return;
    const measure = () =>
      document.documentElement.style.setProperty('--site-scroll-height', scroll.clientHeight + 'px');
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const detail = (document.activeElement as HTMLElement)?.closest('details[open]');
      if (detail) {
        detail.removeAttribute('open');
        detail.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      value={{ light: 'bb-light', dark: 'dark' }}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <label className="theme-control">
      <span>Theme</span>
      <select
        aria-label="Reading theme"
        value={mounted ? theme : 'system'}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
