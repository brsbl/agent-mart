"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Search, ChevronDown, Github, Package } from "lucide-react";

const CATEGORIES = [
  { value: "development", label: "Development" },
  { value: "productivity", label: "Productivity" },
  { value: "learning", label: "Learning" },
  { value: "automation", label: "Automation" },
  { value: "integration", label: "Integration" },
  { value: "utility", label: "Utility" },
];

export function NavBar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="container flex items-center justify-between h-16 gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <Package className="w-6 h-6 text-[var(--accent)]" />
          <span>Agent Mart</span>
        </Link>

        {/* Center nav items */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            Browse
          </Link>

          {/* Categories dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="flex items-center gap-1 text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors outline-none">
              Categories
              <ChevronDown className="w-4 h-4" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-md p-1 z-50"
                sideOffset={8}
              >
                {CATEGORIES.map((category) => (
                  <DropdownMenu.Item
                    key={category.value}
                    className="px-3 py-2 text-sm rounded-md cursor-pointer outline-none hover:bg-[var(--background-secondary)] transition-colors"
                    onSelect={() =>
                      router.push(`/?category=${category.value}`)
                    }
                  >
                    {category.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Search + GitHub */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg transition-all ${
                searchFocused
                  ? "w-64 border-[var(--accent)]"
                  : "w-40 md:w-48"
              }`}
            >
              <Search className="w-4 h-4 text-[var(--foreground-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--foreground-muted)]"
              />
            </div>
          </form>

          {/* GitHub link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  );
}
