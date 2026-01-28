"use client";

import type { Category } from "@/lib/types";
import { getCategoryDisplay, getCategoryBadgeClass } from "@/lib/data";

export interface CategoryPillProps {
  category: Category;
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
  const displayName = getCategoryDisplay(category);

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1.5";

  // Base styling for filter pills
  const baseClasses = isActive
    ? "bg-[var(--accent)] text-white"
    : "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className={`rounded-full ${sizeClasses} ${baseClasses} cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
      >
        {displayName}
      </button>
    );
  }

  // For non-interactive pills, use hash-based badge colors
  const badgeClass = getCategoryBadgeClass(category);

  return (
    <span className={`badge ${badgeClass} ${sizeClasses}`}>{displayName}</span>
  );
}
