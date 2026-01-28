"use client";

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, FileText, Folder } from "lucide-react";
import type { FileTreeEntry } from "@/lib/types";
import { formatBytes } from "@/lib/data";

// Constants
const DEFAULT_EXPAND_DEPTH = 2;
const INDENT_PER_LEVEL = 16;
const BASE_PADDING = 8;

interface FileTreeProps {
  entries: FileTreeEntry[];
  basePath?: string;
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
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
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
}

function TreeNodeComponent({ node, level, selectedFile, onSelectFile }: TreeNodeComponentProps) {
  const [expanded, setExpanded] = useState(() => level < DEFAULT_EXPAND_DEPTH);
  const isFolder = node.type === "tree";
  const hasChildren = node.children.length > 0;
  const isSelected = !isFolder && selectedFile === node.path;

  const handleClick = () => {
    if (isFolder && hasChildren) {
      setExpanded(!expanded);
    } else if (!isFolder && onSelectFile) {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded hover:bg-gray-100 transition-colors cursor-pointer ${
          isFolder && hasChildren ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-400 focus-visible:outline-offset-[-2px]" : ""
        } ${isSelected ? "bg-gray-100 border-l-2 border-gray-600" : ""}`}
        style={{ paddingLeft: `${level * INDENT_PER_LEVEL + BASE_PADDING}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-expanded={isFolder && hasChildren ? expanded : undefined}
        aria-label={isFolder && hasChildren ? `${expanded ? "Collapse" : "Expand"} ${node.name} folder` : `Select ${node.name}`}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Expand/collapse icon for folders */}
        {isFolder && hasChildren ? (
          expanded ? (
            <ChevronDown size={14} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight size={14} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
          )
        ) : (
          <span className="w-3.5" aria-hidden="true" />
        )}

        {/* Icon */}
        {isFolder ? (
          <Folder size={14} className="text-gray-500 flex-shrink-0" fill="currentColor" aria-hidden="true" />
        ) : (
          <FileText size={14} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Name */}
        <span className={`text-sm truncate flex-1 ${isSelected ? "text-gray-900 font-medium" : "text-gray-700"}`}>
          {node.name}
        </span>

        {/* Size for files */}
        {!isFolder && node.size !== null && (
          <span className="text-xs text-gray-400 flex-shrink-0">
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
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ entries, basePath = "", selectedFile, onSelectFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(entries, basePath), [entries, basePath]);

  if (tree.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        No files found
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-900 font-mono">
          Plugin Marketplace Files
        </span>
      </div>
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.path}
            node={node}
            level={0}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
