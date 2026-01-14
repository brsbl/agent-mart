"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Github, Package } from "lucide-react";

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
          <Package className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
          <span>Agent Mart</span>
        </Link>

        {/* Search + GitHub */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg transition-all ${
                searchFocused
                  ? "w-64 border-[var(--accent)]"
                  : "w-40 md:w-64"
              }`}
            >
              <Search className="w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search plugins..."
                aria-label="Search plugins"
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
            href="https://github.com/anthropics/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
