// SPDX-License-Identifier: Apache-2.0
export type CategoryRoute = 'gallery' | 'view' | 'prepare' | 'settings' | 'help';
export type TaskRoute = 'recent-folders' | 'folder-details' | 'sort-filter' | 'layout' | 'information-display' | 'prepare-gallery' | 'thumbnails' | 'preparation-progress' | 'appearance' | 'loading' | 'saved-preferences' | 'history' | 'diagnostics' | 'documentation' | 'about';
export type NavigationRoute = 'menu' | CategoryRoute | TaskRoute;
export type NavigationAction = 'open-folder' | 'refresh' | 'close-folder';
export type NavigationItem = { id: TaskRoute; label: string; action?: false } | { id: NavigationAction; label: string; action: true };
export interface NavigationCategory { id: CategoryRoute; label: string; items: readonly NavigationItem[] }

export const navigation: readonly NavigationCategory[] = [
  { id: 'gallery', label: 'Gallery', items: [
    { id: 'open-folder', label: 'Open folder', action: true },
    { id: 'recent-folders', label: 'Recent folders' },
    { id: 'refresh', label: 'Refresh', action: true },
    { id: 'folder-details', label: 'Folder details' },
    { id: 'close-folder', label: 'Close folder', action: true },
  ] },
  { id: 'view', label: 'View', items: [
    { id: 'sort-filter', label: 'Sort and filter' }, { id: 'layout', label: 'Layout' }, { id: 'information-display', label: 'Information display' },
  ] },
  { id: 'prepare', label: 'Prepare & share', items: [
    { id: 'prepare-gallery', label: 'Prepare gallery' }, { id: 'thumbnails', label: 'Thumbnails' }, { id: 'preparation-progress', label: 'Preparation progress' },
  ] },
  { id: 'settings', label: 'Settings', items: [
    { id: 'appearance', label: 'Appearance' }, { id: 'loading', label: 'Loading' }, { id: 'saved-preferences', label: 'Saved preferences and overrides' }, { id: 'history', label: 'History' },
  ] },
  { id: 'help', label: 'Help', items: [
    { id: 'diagnostics', label: 'Diagnostics' }, { id: 'documentation', label: 'Documentation' }, { id: 'about', label: 'About and licenses' },
  ] },
];
export function parentRoute(route: NavigationRoute): NavigationRoute | null {
  if (route === 'menu') return null;
  if (navigation.some(category => category.id === route)) return 'menu';
  return navigation.find(category => category.items.some(item => item.id === route))?.id ?? 'menu';
}
export function routeTitle(route: NavigationRoute): string {
  if (route === 'menu') return 'Menu';
  return navigation.find(category => category.id === route)?.label
    ?? navigation.flatMap(category => category.items).find(item => item.id === route)?.label
    ?? 'Menu';
}
export function folderName(path: string | null): string {
  if (!path) return 'Local Media Gallery';
  if (/^[\\/]+$/.test(path) || /^[A-Za-z]:[\\/]?$/.test(path)) return path;
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) || path;
}
