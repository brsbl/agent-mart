"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Sparkles,
  Puzzle,
} from "lucide-react";
import { CopyableCommand } from "./CopyableCommand";
import { ExpandableSection } from "./ExpandableSection";
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
          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-muted)]">
            {plugin.commands.length > 0 && (
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" aria-hidden="true" />
                {plugin.commands.length} command{plugin.commands.length !== 1 ? "s" : ""}
              </span>
            )}
            {plugin.skills.length > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {plugin.skills.length} skill{plugin.skills.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          {/* Install Command */}
          <div className="ml-14">
            <CopyableCommand command={plugin.install_commands} />
          </div>

          {/* Commands */}
          {plugin.commands.length > 0 && (
            <div className="ml-14">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 flex items-center gap-2">
                <Terminal className="w-3 h-3" aria-hidden="true" />
                Commands
              </h4>
              <div className="space-y-2">
                {plugin.commands.map((command) => (
                  <ExpandableSection
                    key={command.name}
                    name={command.name}
                    description={command.description}
                    content={command.content}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {plugin.skills.length > 0 && (
            <div className="ml-14">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                Skills
              </h4>
              <div className="space-y-2">
                {plugin.skills.map((skill) => (
                  <ExpandableSection
                    key={skill.name}
                    name={skill.name}
                    description={skill.description}
                    content={skill.content}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
