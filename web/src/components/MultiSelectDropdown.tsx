"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { Category } from "@/lib/types";
import { getCategoryDisplay } from "@/lib/data";

export interface MultiSelectDropdownProps {
  options: Category[];
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

  const displayText = selectedOptions.length === 0
    ? placeholder
    : `${selectedOptions.length} selected`;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm bg-white cursor-pointer transition-colors min-w-[160px] ${
          isOpen
            ? "border-green-700 ring-2 ring-green-700"
            : "border-gray-200 hover:border-gray-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOptions.length === 0 ? "text-gray-500" : "text-gray-900"}>
          {displayText}
        </span>
        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-auto">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClear();
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
              aria-label="Clear all selected categories"
            >
              Clear all
            </button>
          )}
          {options.map((option) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                role="option"
                aria-selected={isSelected}
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? "bg-green-700 border-green-700"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <span className="text-gray-900">{getCategoryDisplay(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
