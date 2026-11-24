// SPDX-License-Identifier: Apache-2.0
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Folder, FolderOpen, Grid2X2,
  Image, Info, LayoutGrid, List, PanelLeft, Play, RefreshCw, Search, Star, Video, X,
} from "lucide-react";
import type { SVGProps } from "react";

const icons = {
  up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight, chevron: ChevronRight,
  folder: Folder, folderOpen: FolderOpen, grid: Grid2X2, image: Image, tiled: LayoutGrid,
  list: List, sidebar: PanelLeft, play: Play, refresh: RefreshCw, search: Search,
  star: Star, video: Video, close: X, info: Info,
};

export type IconName = keyof typeof icons;

export default function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  const Glyph = icons[name];
  return <Glyph size={size} aria-hidden="true" {...props} />;
}
