"use client";

import { useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import type { MarketplacesData, Category } from "@/lib/types";

interface LandingSearchProps {
  data: MarketplacesData | null;
}

const MINIMUM_CATEGORY_COUNT = 2;

export function LandingSearch({ data: marketplacesData }: LandingSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const router = useRouter();

  const categoriesWithCounts = useMemo(() => {
    const marketplaces = marketplacesData?.marketplaces ?? [];
    const counts = new Map<Category, number>();

    marketplaces.forEach(m => {
      if (Array.isArray(m.categories)) {
        m.categories.forEach(c => {
          counts.set(c, (counts.get(c) || 0) + 1);
        });
      }
    });

    return Array.from(counts.entries())
      .filter(([, count]) => count >= MINIMUM_CATEGORY_COUNT)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
  }, [marketplacesData?.marketplaces]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) {
      params.set("q", trimmed);
    }
    if (selectedCategories.length > 0) {
      params.set("cat", selectedCategories.join(","));
    }
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  };

  const handleCategoryToggle = (cat: Category) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <section className="flex justify-center px-4 w-full mt-2 md:mt-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-xs sm:max-w-lg md:max-w-xl bg-card/50 backdrop-blur-md border border-border rounded-xl p-1.5 md:p-2">
        <div className="relative flex-1 min-w-0">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plugins..."
            className="w-full pl-9 pr-11 py-2 sm:py-2.5 text-xs sm:text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-foreground-muted"
            aria-label="Search plugins"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-background-secondary hover:bg-background-tertiary rounded-lg transition-colors"
            aria-label="Search"
          >
            <ArrowRight size={16} className="text-foreground-muted" />
          </button>
        </div>
        <MultiSelectDropdown
          options={categoriesWithCounts}
          selectedOptions={selectedCategories}
          onToggle={handleCategoryToggle}
          onClear={handleClearCategories}
          placeholder="Categories"
        />
      </form>
    </section>
  );
}
