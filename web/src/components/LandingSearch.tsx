"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function LandingSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/browse?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <section className="flex justify-center px-2 pt-64">
      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plugins, skills, commands..."
            className="w-full pl-10 pr-12 py-3 text-base bg-card border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-foreground placeholder:text-foreground-muted transition-colors"
            aria-label="Search plugins"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors"
            aria-label="Search"
          >
            <ArrowRight size={18} className="text-foreground-muted" />
          </button>
        </div>
      </form>
    </section>
  );
}
