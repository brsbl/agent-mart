"use client";

import Link from "next/link";
import Image from "next/image";
import { Store, Star, GitFork } from "lucide-react";
import { formatNumber } from "@/lib/data";

// Props for the marketplace card
// Accepts marketplace data plus author info for flexibility
export interface MarketplaceCardProps {
  marketplace: {
    name: string;
    description: string | null;
    keywords: string[];
    signals: {
      stars: number;
      forks: number;
    };
  };
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
}

export function MarketplaceCard({
  marketplace,
  author_id,
  author_display_name,
  author_avatar_url,
}: MarketplaceCardProps) {
  const marketplaceUrl = `/${author_id}/${marketplace.name}`;

  // Show first 3-4 keywords as badges
  const displayKeywords = marketplace.keywords.slice(0, 4);

  return (
    <div className="card p-4 h-full flex flex-col relative">
      {/* Link covers the card */}
      <Link
        href={marketplaceUrl}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
        aria-label={`View ${marketplace.name} marketplace by ${author_display_name}`}
      />

      {/* Header: Store icon + Name */}
      <div className="flex items-start gap-3 mb-3 relative z-10 pointer-events-none">
        <div className="w-10 h-10 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0">
          <Store className="w-5 h-5 text-[var(--foreground-muted)]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--foreground)] truncate">
            {marketplace.name}
          </h3>
          {/* Author link - needs pointer-events for interactivity */}
          <Link
            href={`/${author_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors pointer-events-auto relative z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {author_avatar_url ? (
              <Image
                src={author_avatar_url}
                alt={author_display_name}
                width={14}
                height={14}
                loading="lazy"
                className="rounded-full"
              />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-[var(--background-secondary)]" />
            )}
            <span className="truncate">@{author_id}</span>
          </Link>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-3 flex-1 relative z-10 pointer-events-none">
        {marketplace.description || "No description"}
      </p>

      {/* Stats: Stars + Forks */}
      <div className="flex items-center gap-4 text-sm text-[var(--foreground-secondary)] mb-3 relative z-10 pointer-events-none">
        <span className="flex items-center gap-1">
          <Star className="w-4 h-4" aria-hidden="true" />
          {formatNumber(marketplace.signals.stars)}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="w-4 h-4" aria-hidden="true" />
          {formatNumber(marketplace.signals.forks)}
        </span>
      </div>

      {/* Keywords as small badges */}
      {displayKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 relative z-10 pointer-events-none">
          {displayKeywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-0.5 text-xs rounded-full bg-[var(--background-secondary)] text-[var(--foreground-muted)]"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

