"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, GitFork, Clock, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/data";
import type { Category } from "@/lib/types";
import { useStarredRepos } from "@/hooks/useStarredRepos";

// Format relative time (e.g., "2d ago", "3mo ago")
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export interface MarketplaceCardProps {
  marketplace: {
    name: string;
    description: string | null;
    keywords: string[];
    categories?: Category[];
    repo_full_name?: string;
    signals: {
      stars: number;
      forks: number;
      pushed_at?: string | null;
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
  const [hasOverflow, setHasOverflow] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const marketplaceUrl = `/${author_id}/${marketplace.name}`;
  const repoId = marketplace.repo_full_name || `${author_id}/${marketplace.name}`;
  const { isStarred, toggleStar } = useStarredRepos();
  const starred = isStarred(repoId);

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

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar(repoId);
  };

  return (
    <Link
      href={marketplaceUrl}
      className="border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all bg-white flex flex-col h-full card-hover-scroll cursor-pointer group overflow-hidden"
    >
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 min-w-0 mb-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors truncate">
              {marketplace.name}
            </h3>
            <ChevronRight
              size={18}
              className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all flex-shrink-0"
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
                className="w-5 h-5 rounded-full border border-gray-300"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 border border-gray-300" />
            )}
            <p className="text-xs text-gray-600 font-mono">@{author_id}</p>
          </div>
        </div>
        <div
          className={`relative mb-4 flex-1 description-fade ${!hasOverflow ? "no-overflow" : ""}`}
        >
          <div
            ref={descriptionRef}
            className="h-20 overflow-y-auto pr-2 scrollbar-thin bg-gray-50 rounded-lg p-3"
          >
            <p className="text-xs text-gray-700">
              {marketplace.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <button
            type="button"
            onClick={handleStarClick}
            className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Star
              size={12}
              className={starred ? "text-yellow-500" : ""}
              fill={starred ? "currentColor" : "none"}
            />
            {formatNumber(marketplace.signals.stars)}
          </button>
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
