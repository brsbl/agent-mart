"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import type { FileTreeEntry } from "@/lib/types";
import { formatBytes } from "@/lib/data";

// Constants
const DEFAULT_EXPAND_DEPTH = 2;
const INDENT_PER_LEVEL = 16;
const BASE_PADDING = 8;

interface FileTreeProps {
  entries: FileTreeEntry[];
  basePath?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "blob" | "tree";
  size: number | null;
  children: TreeNode[];
}

// Build tree structure from flat entries
function buildTree(entries: FileTreeEntry[], basePath: string): TreeNode[] {
  const root: TreeNode[] = [];

  // Filter entries that start with basePath
  const filtered = entries.filter((e) => e.path.startsWith(basePath));

  for (const entry of filtered) {
    // Get path relative to basePath
    const relativePath = entry.path.slice(basePath.length).replace(/^\//, "");
    const parts = relativePath.split("/");

    let current = root;
    let currentPath = basePath;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isLast ? entry.type : "tree",
          size: isLast ? entry.size : null,
          children: [],
        };
        current.push(node);
      }

      current = node.children;
    }
  }

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type === "tree" && b.type !== "tree") return -1;
        if (a.type !== "tree" && b.type === "tree") return 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));
  };

  return sortNodes(root);
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
}

function TreeNodeComponent({ node, level }: TreeNodeComponentProps) {
  const [expanded, setExpanded] = useState(level < DEFAULT_EXPAND_DEPTH);
  const isFolder = node.type === "tree";
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded hover:bg-[var(--background-secondary)] transition-colors ${
          isFolder && hasChildren ? "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]" : ""
        }`}
        style={{ paddingLeft: `${level * INDENT_PER_LEVEL + BASE_PADDING}px` }}
        onClick={() => {
          if (isFolder && hasChildren) {
            setExpanded(!expanded);
          }
        }}
        {...(isFolder && hasChildren
          ? {
              role: "button",
              tabIndex: 0,
              "aria-expanded": expanded,
              "aria-label": `${expanded ? "Collapse" : "Expand"} ${node.name} folder`,
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded(!expanded);
                }
              },
            }
          : {})}
      >
        {/* Expand/collapse icon for folders */}
        {isFolder && hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)] flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] flex-shrink-0" aria-hidden="true" />
          )
        ) : (
          <span className="w-4" aria-hidden="true" />
        )}

        {/* Icon */}
        {isFolder ? (
          <Folder className="w-4 h-4 text-[var(--accent)] flex-shrink-0" aria-hidden="true" />
        ) : (
          <File className="w-4 h-4 text-[var(--foreground-muted)] flex-shrink-0" aria-hidden="true" />
        )}

        {/* Name */}
        <span className="text-sm text-[var(--foreground)] truncate flex-1">
          {node.name}
        </span>

        {/* Size for files */}
        {!isFolder && node.size !== null && (
          <span className="text-xs text-[var(--foreground-muted)] flex-shrink-0">
            {formatBytes(node.size)}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ entries, basePath = "" }: FileTreeProps) {
  const tree = useMemo(() => buildTree(entries, basePath), [entries, basePath]);

  if (tree.length === 0) {
    return (
      <div className="text-sm text-[var(--foreground-muted)] py-2">
        No files found
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="bg-[var(--background-secondary)] px-3 py-2 border-b border-[var(--border)]">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Files
        </span>
      </div>
      <div className="py-1 max-h-[300px] overflow-y-auto">
        {tree.map((node) => (
          <TreeNodeComponent key={node.path} node={node} level={0} />
        ))}
      </div>
    </div>
  );
}
