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
  const [open, setOpen] = useState(false);
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortField);
  const ArrowIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
  };

  const handleSelect = (value: MarketplaceSortOption) => {
    onSortFieldChange(value);
    setOpen(false);
  };

  return (
    <div className="relative flex items-center">
      {/* Direction toggle */}
      <button
        type="button"
        onClick={toggleDirection}
        className="h-[42px] w-[42px] flex items-center justify-center border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
      >
        <ArrowIcon size={16} className="text-gray-600 dark:text-gray-400" />
      </button>

      {/* Field dropdown using Popover */}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="h-[42px] flex items-center gap-2 px-3 border border-gray-200 dark:border-gray-700 rounded-r-lg text-sm bg-white dark:bg-gray-800 cursor-pointer transition-colors min-w-[140px] hover:border-gray-300 dark:hover:border-gray-600"
            aria-label="Sort by"
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="text-gray-900 dark:text-gray-100">{currentOption?.label}</span>
            <ChevronDown size={16} className="ml-auto text-gray-400" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
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
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
