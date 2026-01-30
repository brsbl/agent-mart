"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import type { MarketplaceSortOption } from "@/lib/types";

export interface SortDropdownProps {
  sortField: MarketplaceSortOption;
  sortDirection: "asc" | "desc";
  onSortFieldChange: (field: MarketplaceSortOption) => void;
  onSortDirectionChange: (direction: "asc" | "desc") => void;
}

const SORT_OPTIONS: { value: MarketplaceSortOption; label: string }[] = [
  { value: "popular", label: "Popularity" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Last Updated" },
];

export function SortDropdown({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortField);
  const ArrowIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSelect = (value: MarketplaceSortOption) => {
    onSortFieldChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center">
      {/* Direction toggle */}
      <button
        type="button"
        onClick={toggleDirection}
        className="h-[42px] w-[42px] flex items-center justify-center border border-r-0 border-border rounded-l-lg bg-card hover:bg-card-hover cursor-pointer transition-colors"
        aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
      >
        <ArrowIcon size={16} className="text-foreground-secondary" />
      </button>

      {/* Field dropdown using Popover */}
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="h-[42px] flex items-center gap-2 px-3 border border-border rounded-r-lg text-sm bg-card cursor-pointer transition-colors min-w-[140px] hover:border-border-hover"
            aria-label="Sort by"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="text-foreground">{currentOption?.label}</span>
            <ChevronDown size={16} className="ml-auto text-foreground-muted" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="w-[140px] bg-card border border-border rounded-lg shadow-lg z-50 py-1"
            sideOffset={4}
            align="start"
          >
            <div role="listbox">
              {SORT_OPTIONS.map((option) => {
                const isSelected = option.value === sortField;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-left text-sm cursor-pointer ${
                      isSelected
                        ? "bg-background-hover text-foreground"
                        : "text-foreground-secondary hover:bg-background-hover"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
