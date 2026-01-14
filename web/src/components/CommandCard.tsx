"use client";

import Link from "next/link";
import { Terminal, Star } from "lucide-react";
import type { FlatCommand } from "@/lib/types";
import { formatNumber } from "@/lib/data";

interface CommandCardProps {
  command: FlatCommand;
}

export function CommandCard({ command }: CommandCardProps) {
  return (
    <Link
      href={`/plugin/${command.owner_id}/${command.plugin_name}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
    >
      <article className="card p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--accent)]" />
            <code className="font-mono font-semibold text-[var(--foreground)]">
              {command.name}
            </code>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-3">
          {command.description || "No description"}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <span className="truncate">
            {command.plugin_name} &middot; {command.repo_full_name}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-3 h-3" aria-hidden="true" />
            {formatNumber(command.stars)}
          </span>
        </div>
      </article>
    </Link>
  );
}
