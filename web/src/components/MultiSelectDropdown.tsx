"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { getCategoryDisplay } from "@/lib/data";
import type { Category } from "@/lib/types";

interface CategoryOption {
  category: Category;
  count: number;
}

interface MultiSelectDropdownProps {
  options: CategoryOption[];
  selectedOptions: Category[];
  onToggle: (option: Category) => void;
  onClear: () => void;
  placeholder: string;
}

export function MultiSelectDropdown({
  options,
  selectedOptions,
  onToggle,
  onClear,
  placeholder,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(opt =>
      opt.category.toLowerCase().includes(query) ||
      getCategoryDisplay(opt.category).toLowerCase().includes(query)
    );
  }, [options, search]);

  const displayText = selectedOptions.length === 0
    ? placeholder
    : `${selectedOptions.length} selected`;

  return (
    <Popover.Root open={isOpen} onOpenChange={(newOpen) => {
      setIsOpen(newOpen);
      if (!newOpen) setSearch("");
    }}>
      <Popover.Trigger asChild>
        <div className={`relative transition-all duration-150 ${isOpen ? "w-[260px]" : "w-auto"}`}>
          {/* When closed: show pill button */}
          {!isOpen && (
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 whitespace-nowrap"
              aria-haspopup="listbox"
            >
              <span className={selectedOptions.length === 0 ? "text-gray-500" : "text-gray-900"}>
                {displayText}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          )}
          {/* When open: show search input expanded */}
          {isOpen && (
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white w-full">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder-gray-400 min-w-0 focus-none"
                onClick={(e) => e.stopPropagation()}
              />
              {search ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch("");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              )}
            </div>
          )}
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-[260px] bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Clear all */}
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100 rounded-t-lg"
              aria-label="Clear all selected categories"
            >
              Clear all
            </button>
          )}

          {/* Options list - with inset scrollbar to avoid corner clipping */}
          <div
            className="max-h-64 overflow-y-auto my-2 mx-1 pr-1 category-dropdown-scroll"
            role="listbox"
          >
            {filteredOptions.map(({ category, count }) => {
              const isSelected = selectedOptions.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onToggle(category)}
                  className="w-full px-2 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer rounded"
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-gray-700 border-gray-700" : "border-gray-300"
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="flex-1 text-gray-900 truncate">{getCategoryDisplay(category)}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center flex-shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-2 py-2 text-sm text-gray-500">No categories found</div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
