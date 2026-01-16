"use client";

import type { MarketplaceCategory } from "@/lib/types";
import {
  getMarketplaceCategoryDisplay,
  getMarketplaceCategoryBadgeClass,
} from "@/lib/data";

export interface CategoryPillProps {
  category: MarketplaceCategory;
  onClick?: () => void;
  isActive?: boolean;
  size?: "sm" | "md";
}

export function CategoryPill({
  category,
  onClick,
  isActive = false,
  size = "sm",
}: CategoryPillProps) {
  const displayName = getMarketplaceCategoryDisplay(category);
  const badgeClass = getMarketplaceCategoryBadgeClass(category);

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";
  const activeClasses = isActive
    ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--background)]"
    : "";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className={`badge ${badgeClass} ${sizeClasses} ${activeClasses} cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
      >
        {displayName}
      </button>
    );
  }

  return (
    <span className={`badge ${badgeClass} ${sizeClasses}`}>{displayName}</span>
  );
}
