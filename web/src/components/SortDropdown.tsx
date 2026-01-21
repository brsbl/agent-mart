"use client";

import { useState, useRef, useEffect } from "react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortField);
  const ArrowIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
  };

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      {/* Direction toggle */}
      <button
        type="button"
        onClick={toggleDirection}
        className="p-2.5 border border-r-0 border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
      >
        <ArrowIcon size={16} className="text-gray-600" />
      </button>

      {/* Field dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2.5 border rounded-r-lg text-sm bg-white cursor-pointer transition-colors min-w-[140px] ${
          isOpen
            ? "border-green-700 ring-2 ring-green-700"
            : "border-gray-200 hover:border-gray-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-gray-900">{currentOption?.label}</span>
        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSortFieldChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer ${
                option.value === sortField ? "bg-gray-50 text-green-700 font-medium" : "text-gray-900"
              }`}
              role="option"
              aria-selected={option.value === sortField}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
