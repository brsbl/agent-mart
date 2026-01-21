"use client";

import * as Select from "@radix-ui/react-select";
import { ArrowUp, ArrowDown, ChevronDown, Check } from "lucide-react";
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
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortField);
  const ArrowIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
  };

  return (
    <div className="relative flex items-center">
      {/* Direction toggle */}
      <button
        type="button"
        onClick={toggleDirection}
        className="h-[42px] w-[42px] flex items-center justify-center border border-r-0 border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
      >
        <ArrowIcon size={16} className="text-gray-600" />
      </button>

      {/* Field dropdown using Radix Select */}
      <Select.Root value={sortField} onValueChange={(value) => onSortFieldChange(value as MarketplaceSortOption)}>
        <Select.Trigger
          className="h-[42px] flex items-center gap-2 px-3 border border-gray-200 rounded-r-lg text-sm bg-white cursor-pointer transition-colors min-w-[140px] hover:border-gray-300 data-[state=open]:border-gray-400 data-[state=open]:ring-1 data-[state=open]:ring-gray-400 outline-none"
          aria-label="Sort by"
        >
          <Select.Value>
            <span className="text-gray-900">{currentOption?.label}</span>
          </Select.Value>
          <ChevronDown size={16} className="ml-auto text-gray-400" />
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
            position="popper"
            sideOffset={4}
            align="end"
          >
            <Select.Viewport>
              {SORT_OPTIONS.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex items-center px-3 py-2 text-sm text-gray-900 cursor-pointer outline-none hover:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-50 data-[state=checked]:font-medium"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-3">
                    <Check size={14} className="text-gray-600" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
