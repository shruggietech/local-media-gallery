// SPDX-License-Identifier: Apache-2.0
"use client";

import { memo, useMemo, useState } from "react";
import type { Asset } from "@/lib/types";
import Icon from "./Icon";

interface Node {
  path: string;
  name: string;
  count: number;
  children: Node[];
}

function buildTree(assets: Asset[]): { root: Node; total: number } {
  const root: Node = { path: "", name: "", count: 0, children: [] };
  const index = new Map<string, Node>([["", root]]);
  const ensure = (path: string): Node => {
    let n = index.get(path);
    if (n) return n;
    const slash = path.lastIndexOf("/");
    const parent = ensure(slash < 0 ? "" : path.slice(0, slash));
    n = { path, name: path.slice(slash + 1), count: 0, children: [] };
    parent.children.push(n);
    index.set(path, n);
    return n;
  };
  for (const a of assets) {
    let n = ensure(a.dir);
    while (true) {
      n.count++;
      if (n.path === "") break;
      const slash = n.path.lastIndexOf("/");
      n = index.get(slash < 0 ? "" : n.path.slice(0, slash))!;
    }
  }
  const sort = (n: Node) => {
    n.children.sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true, sensitivity: "base" }));
    n.children.forEach(sort);
  };
  sort(root);
  return { root, total: root.count };
}

interface Props {
  assets: Asset[];
  folder: string | null;
  rootName: string;
  onSelect: (folder: string | null) => void;
}

function Sidebar({ assets, folder, rootName, onSelect }: Props) {
  const { root, total } = useMemo(() => buildTree(assets), [assets]);
  return (
    <nav className="sidebar" aria-label="Folders">
      <div className="sidebar-title mono">Folders</div>
      <button className={"tree-row" + (folder === null ? " is-active" : "")} aria-current={folder === null ? "true" : undefined} onClick={() => onSelect(null)}>
        <Icon name="grid" size={16} />
        <span className="tree-name">All Media</span>
        <span className="tree-count mono">{total.toLocaleString()}</span>
      </button>
      <div className="tree-scroll">
        {root.children.map((c) => (
          <TreeNode key={c.path} node={c} depth={0} folder={folder} onSelect={onSelect} />
        ))}
        {root.children.length === 0 && <p className="muted tree-empty">{rootName}: no subfolders</p>}
      </div>
    </nav>
  );
}

function TreeNode({ node, depth, folder, onSelect }: { node: Node; depth: number; folder: string | null; onSelect: (f: string | null) => void }) {
  const inPath = folder !== null && (folder === node.path || folder.startsWith(node.path + "/"));
  const [open, setOpen] = useState(depth === 0 ? inPath : false);
  const expanded = open || (inPath && folder !== node.path);
  const hasKids = node.children.length > 0;
  return (
    <div>
      <div className={"tree-row" + (folder === node.path ? " is-active" : "")} style={{ paddingLeft: 8 + depth * 16 }}>
        <button
          className={"tree-twisty" + (hasKids ? "" : " is-hidden")}
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={hasKids ? expanded : undefined}
          onClick={() => setOpen(!expanded)}
          tabIndex={hasKids ? 0 : -1}
        >
          <Icon name="chevron" size={14} className="tree-chev" style={{ transform: expanded ? "rotate(90deg)" : undefined }} />
        </button>
        <button className="tree-label" aria-current={folder === node.path ? "true" : undefined} onClick={() => onSelect(node.path)} title={node.path}>
          <Icon name={folder === node.path ? "folderOpen" : "folder"} size={16} />
          <span className="tree-name">{node.name}</span>
          <span className="tree-count mono">{node.count.toLocaleString()}</span>
        </button>
      </div>
      {expanded && <div className="tree-kids">{node.children.map((c) => <TreeNode key={c.path} node={c} depth={depth + 1} folder={folder} onSelect={onSelect} />)}</div>}
    </div>
  );
}

export default memo(Sidebar);
