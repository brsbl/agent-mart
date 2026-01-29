"use client";

import Image from "next/image";
import { Star, Copy, Check } from "lucide-react";
import type { BrowsePlugin, FlatPlugin } from "@/lib/types";
import { formatNumber, getCategoryBadgeClass, getCategoryDisplayName } from "@/lib/data";
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

// Max categories to display on plugin cards
const MAX_CATEGORIES = 3;

export function PluginCard({ plugin }: PluginCardProps) {
  const { copied, copy } = useCopyToClipboard();
  const categories = plugin.categories ?? [];
  const displayCategories = categories.slice(0, MAX_CATEGORIES);
  const remainingCount = categories.length - MAX_CATEGORIES;
  const ownerId = getOwnerId(plugin);
  const ownerDisplayName = getOwnerDisplayName(plugin);
  const ownerAvatarUrl = getOwnerAvatarUrl(plugin);

  const handleCopy = () => {
    copy(plugin.install_commands.join("\n"));
  };

  return (
    <div className="bg-card border border-border rounded-md shadow-sm hover:border-border-hover hover:shadow-md transition-all p-4 h-full flex flex-col">
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3 mb-3">
        <Image
          src={ownerAvatarUrl}
          alt={ownerDisplayName}
          width={40}
          height={40}
          loading="lazy"
          className="rounded-full flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">
            {plugin.name}
          </h3>
          <p className="text-xs text-foreground-muted truncate">
            by @{ownerId}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground-secondary line-clamp-2 mb-3 flex-1">
        {plugin.description || "No description"}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-foreground-secondary mb-3">
        <span className="flex items-center gap-1">
          <Star className="w-4 h-4" aria-hidden="true" />
          {formatNumber(plugin.signals.stars)}
        </span>
      </div>

      {/* Footer: Categories + Copy button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {displayCategories.map((cat) => (
            <span key={cat} className={`badge ${getCategoryBadgeClass(cat)}`}>
              {getCategoryDisplayName(cat)}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-foreground-muted">
              +{remainingCount}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          aria-label={copied ? "Copied!" : "Copy install command"}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-success" aria-hidden="true" />
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
    <div className="bg-card border border-border rounded-md shadow-sm hover:border-border-hover hover:shadow-md transition-all p-3 flex items-center gap-3 min-w-[280px]">
      <Image
        src={ownerAvatarUrl}
        alt={ownerDisplayName}
        width={32}
        height={32}
        loading="lazy"
        className="rounded-full flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm text-foreground truncate">
          {plugin.name}
        </h3>
        <p className="text-xs text-foreground-muted truncate">
          {plugin.description || "No description"}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-foreground-muted flex-shrink-0">
        <Star className="w-3 h-3" aria-hidden="true" />
        {formatNumber(plugin.signals.stars)}
      </div>
    </div>
  );
}
