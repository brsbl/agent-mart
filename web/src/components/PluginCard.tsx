"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Terminal, Copy, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { FlatPlugin } from "@/lib/types";
import { formatNumber, getCategoryBadgeClass, normalizeCategory, getCategoryDisplayName } from "@/lib/data";

interface PluginCardProps {
  plugin: FlatPlugin;
}

export function PluginCard({ plugin }: PluginCardProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const installCmd = plugin.install_commands.join("\n");
    try {
      await navigator.clipboard.writeText(installCmd);
      setCopied(true);
      // Clear any existing timeout before setting a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const pluginUrl = `/plugin/${plugin.owner_id}/${plugin.name}`;

  return (
    <Link
      href={pluginUrl}
      className="card p-4 h-full flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-3 mb-3">
          <Image
            src={plugin.owner_avatar_url}
            alt={plugin.owner_display_name}
            width={40}
            height={40}
            loading="lazy"
            className="rounded-full flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--foreground)] truncate">
              {plugin.name}
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] truncate">
              by @{plugin.owner_id}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-3 flex-1">
          {plugin.description || "No description"}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)] mb-3">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {formatNumber(plugin.signals.stars)}
          </span>
          {plugin.commands.length > 0 && (
            <span className="flex items-center gap-1">
              <Terminal className="w-4 h-4" />
              {plugin.commands.length} command
              {plugin.commands.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Footer: Category + Copy button */}
        <div className="flex items-center justify-between gap-2">
          <span className={`badge ${getCategoryBadgeClass(normalizeCategory(plugin.category))}`}>
            {getCategoryDisplayName(normalizeCategory(plugin.category))}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
            title={copied ? "Copied!" : "Copy install command"}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[var(--success)]" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
    </Link>
  );
}

// Compact variant for horizontal lists
export function PluginCardCompact({ plugin }: PluginCardProps) {
  return (
    <Link
      href={`/plugin/${plugin.owner_id}/${plugin.name}`}
      className="card p-3 flex items-center gap-3 min-w-[280px]"
    >
      <Image
        src={plugin.owner_avatar_url}
        alt={plugin.owner_display_name}
        width={32}
        height={32}
        loading="lazy"
        className="rounded-full flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm text-[var(--foreground)] truncate">
          {plugin.name}
        </h3>
        <p className="text-xs text-[var(--foreground-muted)] truncate">
          {plugin.description || "No description"}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-[var(--foreground-muted)] flex-shrink-0">
        <Star className="w-3 h-3" />
        {formatNumber(plugin.signals.stars)}
      </div>
    </Link>
  );
}
