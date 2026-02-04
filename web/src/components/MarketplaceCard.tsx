"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, GitFork, Clock, ChevronRight } from "lucide-react";
import { formatNumber, formatRelativeTime } from "@/lib/data";
import type { Category } from "@/lib/types";

export interface MarketplaceCardProps {
  marketplace: {
    name: string;
    description: string | null;
    categories?: Category[];
    repo_full_name?: string;
    signals: {
      stars: number;
      forks: number;
      pushed_at?: string | null;
      stars_gained_7d?: number;
    };
  };
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  showTrendingBadge?: boolean;
}

export function MarketplaceCard({
  marketplace,
  author_id,
  author_display_name,
  author_avatar_url,
  showTrendingBadge = false,
}: MarketplaceCardProps) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const marketplaceUrl = `/${author_id}/${marketplace.name}`;

  useEffect(() => {
    const checkOverflow = () => {
      if (descriptionRef.current) {
        const { scrollHeight, clientHeight } = descriptionRef.current;
        setHasOverflow(scrollHeight > clientHeight);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [marketplace.description]);

  return (
    <Link
      href={marketplaceUrl}
      className="relative border border-border rounded-xl hover:border-border-hover hover:shadow-md transition-all bg-card flex flex-col h-full card-hover-scroll cursor-pointer group overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[4px] before:bg-transparent before:rounded-l-xl before:transition-colors hover:before:bg-accent"
    >
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 min-w-0 mb-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base font-semibold text-foreground group-hover:text-foreground-secondary transition-colors truncate">
                {marketplace.name}
              </h3>
            </div>
            <ChevronRight
              size={18}
              className="text-foreground-muted group-hover:text-foreground-secondary group-hover:translate-x-0.5 transition-all flex-shrink-0"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {author_avatar_url ? (
              <Image
                src={author_avatar_url}
                alt={author_display_name}
                width={20}
                height={20}
                loading="lazy"
                className="w-5 h-5 rounded-full border border-border"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-background-secondary border border-border" />
            )}
            <p className="text-xs text-foreground-secondary font-mono">@{author_id}</p>
          </div>
        </div>
        <div
          className={`relative mb-4 flex-1 ${hasOverflow ? "after:absolute after:inset-x-0 after:bottom-0 after:h-4 after:bg-gradient-to-t after:from-background-secondary/80 after:to-transparent after:rounded-b-lg after:pointer-events-none" : ""}`}
        >
          <div
            ref={descriptionRef}
            className="h-20 overflow-y-auto pr-2 scrollbar-thin bg-background-secondary/40 rounded-lg p-3"
          >
            <p className="text-xs text-foreground-secondary">
              {marketplace.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-foreground-secondary">
          <span className="flex items-center gap-1">
            <Star size={12} className="text-yellow-500" fill="currentColor" /> {formatNumber(marketplace.signals.stars)}
            {showTrendingBadge && marketplace.signals.stars_gained_7d != null && marketplace.signals.stars_gained_7d > 0 && (
              <sup className="text-[10px] text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100">
                +{formatNumber(marketplace.signals.stars_gained_7d)}
              </sup>
            )}
          </span>
          <span className="flex items-center gap-1">
            <GitFork size={12} /> {formatNumber(marketplace.signals.forks)}
          </span>
          {marketplace.signals.pushed_at && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {formatRelativeTime(marketplace.signals.pushed_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
