"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Puzzle,
} from "lucide-react";
import { CopyableCommand } from "./CopyableCommand";
import type { Plugin } from "@/lib/types";

interface PluginSectionProps {
  plugin: Plugin;
  defaultExpanded?: boolean;
}

export function PluginSection({ plugin, defaultExpanded = false }: PluginSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div id={plugin.name} className="card scroll-mt-24">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-start gap-4 cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0">
          <Puzzle className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{plugin.name}</h3>
            <span className="text-[var(--foreground-muted)]">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-2">
            {plugin.description || "No description"}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          {/* Install Command */}
          <div className="ml-14">
            <CopyableCommand command={plugin.install_commands} />
          </div>
        </div>
      )}
    </div>
  );
}
