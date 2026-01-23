"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Copy, Check } from "lucide-react";
import type { BrowsePlugin, FlatPlugin } from "@/lib/types";
import { formatNumber, getCategoryBadgeClass, normalizeCategory, getCategoryDisplayName } from "@/lib/data";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

// Accept both browse (lightweight) and full plugin types
type PluginCardPlugin = BrowsePlugin | FlatPlugin;

interface PluginCardProps {
  plugin: PluginCardPlugin;
}

// Helper to get owner/author properties (both types use different naming)
function getOwnerId(plugin: PluginCardPlugin): string {
  return 'owner_id' in plugin ? plugin.owner_id : plugin.author_id;
}

function getOwnerDisplayName(plugin: PluginCardPlugin): string {
  return 'owner_display_name' in plugin ? plugin.owner_display_name : plugin.author_display_name;
}

function getOwnerAvatarUrl(plugin: PluginCardPlugin): string {
  return 'owner_avatar_url' in plugin ? plugin.owner_avatar_url : plugin.author_avatar_url;
}

export function PluginCard({ plugin }: PluginCardProps) {
  const { copied, copy } = useCopyToClipboard();
  const category = plugin.categories?.[0] ?? 'orchestration';
  const normalizedCategory = normalizeCategory(category);
  const ownerId = getOwnerId(plugin);
  const ownerDisplayName = getOwnerDisplayName(plugin);
  const ownerAvatarUrl = getOwnerAvatarUrl(plugin);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copy(plugin.install_commands.join("\n"));
  };

  const pluginUrl = `/plugin/${ownerId}/${plugin.name}`;

  return (
    <div className="card p-4 h-full flex flex-col relative">
      {/* Link covers the card content but not the copy button */}
      <Link
        href={pluginUrl}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
        aria-label={`View ${plugin.name} by ${ownerId}`}
      />

      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3 mb-3 relative z-10 pointer-events-none">
        <Image
          src={ownerAvatarUrl}
          alt={ownerDisplayName}
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
            by @{ownerId}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-3 flex-1 relative z-10 pointer-events-none">
        {plugin.description || "No description"}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)] mb-3 relative z-10 pointer-events-none">
        <span className="flex items-center gap-1">
          <Star className="w-4 h-4" aria-hidden="true" />
          {formatNumber(plugin.signals.stars)}
        </span>
      </div>

      {/* Footer: Category + Copy button */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <span className={`badge ${getCategoryBadgeClass(normalizedCategory)} pointer-events-none`}>
          {getCategoryDisplayName(normalizedCategory)}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]"
          aria-label={copied ? "Copied!" : "Copy install command"}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[var(--success)]" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Compact variant for horizontal lists
export function PluginCardCompact({ plugin }: PluginCardProps) {
  const ownerId = getOwnerId(plugin);
  const ownerDisplayName = getOwnerDisplayName(plugin);
  const ownerAvatarUrl = getOwnerAvatarUrl(plugin);

  return (
    <Link
      href={`/plugin/${ownerId}/${plugin.name}`}
      className="card p-3 flex items-center gap-3 min-w-[280px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
    >
      <Image
        src={ownerAvatarUrl}
        alt={ownerDisplayName}
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
        <Star className="w-3 h-3" aria-hidden="true" />
        {formatNumber(plugin.signals.stars)}
      </div>
    </Link>
  );
}
