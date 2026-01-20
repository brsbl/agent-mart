"use client";

import type { TechStack, Capability } from "@/lib/types";
import { getTechStackDisplay, getCapabilityDisplay } from "@/lib/data";

// Union type for filter pills
export type FilterCategory = TechStack | Capability;

export interface CategoryPillProps {
  category: FilterCategory;
  type: "techStack" | "capability";
  onClick?: () => void;
  isActive?: boolean;
  size?: "sm" | "md";
}

export function CategoryPill({
  category,
  type,
  onClick,
  isActive = false,
  size = "sm",
}: CategoryPillProps) {
  const displayName = type === "techStack"
    ? getTechStackDisplay(category as TechStack)
    : getCapabilityDisplay(category as Capability);

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

  return (
    <span className={`rounded-full ${sizeClasses} ${baseClasses}`}>{displayName}</span>
  );
}
