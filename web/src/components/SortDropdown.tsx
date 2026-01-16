"use client";

import { ChevronDown } from "lucide-react";
import type { MarketplaceSortOption } from "@/lib/types";

export interface SortDropdownProps {
  value: MarketplaceSortOption;
  onChange: (value: MarketplaceSortOption) => void;
}

const SORT_OPTIONS: { value: MarketplaceSortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently Updated" },
];

function isValidSortOption(value: string): value is MarketplaceSortOption {
  return SORT_OPTIONS.some((opt) => opt.value === value);
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          if (isValidSortOption(newValue)) {
            onChange(newValue);
          }
        }}
        className="appearance-none bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--foreground)] cursor-pointer hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
        aria-label="Sort marketplaces"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
