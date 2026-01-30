"use client";

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { SortDropdown } from "./SortDropdown";
import type { MarketplaceSortOption, Category } from "@/lib/types";
import { useFetch } from "@/hooks";
import { DATA_URLS } from "@/lib/constants";
import type { BrowseMarketplace, Meta } from "@/lib/types";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

export function SearchFilter() {
  return (
    <Suspense fallback={<SearchFilterSkeleton />}>
      <SearchFilterContent />
    </Suspense>
  );
}

function SearchFilterSkeleton() {
  return (
    <div className="sticky top-[73px] z-40 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-[42px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="w-[160px] h-[42px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="w-[180px] h-[42px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function SearchFilterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search state
  const searchQuery = searchParams.get("q") || "";
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Filter state from URL
  const categoriesParam = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
  const sortByParam = (searchParams.get("sort") as MarketplaceSortOption) || "trending";
  const sortDirParam = (searchParams.get("dir") as "asc" | "desc") || "desc";

  const [sortBy, setSortBy] = useState<MarketplaceSortOption>(sortByParam);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(sortDirParam);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(categoriesParam);

  // Fetch marketplaces to get available categories
  const { data: marketplacesData } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplaces."
  );

  const allMarketplaces = useMemo(() => marketplacesData?.marketplaces ?? [], [marketplacesData?.marketplaces]);

  // Minimum count for a category to be shown in the dropdown
  const MINIMUM_CATEGORY_COUNT = 2;

  // Get categories with counts, filtered by minimum count, sorted by count descending
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<Category, number>();

    allMarketplaces.forEach(m => {
      if (Array.isArray(m.categories)) {
        m.categories.forEach(c => {
          counts.set(c, (counts.get(c) || 0) + 1);
        });
      }
    });

    return Array.from(counts.entries())
      .filter(([_, count]) => count >= MINIMUM_CATEGORY_COUNT)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([category, count]) => ({ category, count }));
  }, [allMarketplaces]);

  // Sync local search with URL
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Sync state from URL on browser navigation
  useEffect(() => {
    const cats = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
    setSelectedCategories(cats);
    setSortBy((searchParams.get("sort") as MarketplaceSortOption) || "trending");
    setSortDirection((searchParams.get("dir") as "asc" | "desc") || "desc");
  }, [searchParams]);

  // Debounced URL update
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateURL = useCallback((
    cats: Category[],
    sort: MarketplaceSortOption,
    dir: "asc" | "desc",
    query?: string
  ) => {
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (query !== undefined) {
        if (query.trim()) {
          params.set("q", query.trim());
        } else {
          params.delete("q");
        }
      }

      if (cats.length > 0) {
        params.set("cat", cats.join(","));
      } else {
        params.delete("cat");
      }

      if (sort !== "trending") {
        params.set("sort", sort);
      } else {
        params.delete("sort");
      }

      if (dir !== "desc") {
        params.set("dir", dir);
      } else {
        params.delete("dir");
      }

      const newURL = params.toString() ? `/?${params.toString()}` : "/";
      router.replace(newURL, { scroll: false });
    }, 50);
  }, [searchParams, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(selectedCategories, sortBy, sortDirection, localSearchQuery);
  };

  const handleCategoryToggle = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat];
      updateURL(next, sortBy, sortDirection);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    updateURL([], sortBy, sortDirection);
  };

  const handleSortChange = (newSort: MarketplaceSortOption) => {
    setSortBy(newSort);
    updateURL(selectedCategories, newSort, sortDirection);
  };

  const handleSortDirectionChange = (newDir: "asc" | "desc") => {
    setSortDirection(newDir);
    updateURL(selectedCategories, sortBy, newDir);
  };

  return (
    <div className="sticky top-[73px] z-40 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="flex-1">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-transparent bg-white"
                />
                {localSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearchQuery("");
                      updateURL(selectedCategories, sortBy, sortDirection, "");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Category Multi-Select Dropdown */}
          <MultiSelectDropdown
            options={categoriesWithCounts}
            selectedOptions={selectedCategories}
            onToggle={handleCategoryToggle}
            onClear={clearFilters}
            placeholder="All Categories"
          />

          {/* Sort Dropdown */}
          <SortDropdown
            sortField={sortBy}
            sortDirection={sortDirection}
            onSortFieldChange={handleSortChange}
            onSortDirectionChange={handleSortDirectionChange}
          />
        </div>
      </div>
    </div>
  );
}
