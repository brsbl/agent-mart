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

export function SearchFilterControls() {
  return (
    <Suspense fallback={<SearchFilterControlsSkeleton />}>
      <SearchFilterControlsContent />
    </Suspense>
  );
}

function SearchFilterControlsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 h-[38px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="w-[140px] h-[38px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="w-[160px] h-[38px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    </div>
  );
}

function SearchFilterControlsContent() {
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
      .sort((a, b) => b[1] - a[1])
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
  // Debounce ref for typeahead search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to store current filter state to avoid stale closures in debounced callbacks
  const filterStateRef = useRef({ selectedCategories, sortBy, sortDirection });
  useEffect(() => {
    filterStateRef.current = { selectedCategories, sortBy, sortDirection };
  }, [selectedCategories, sortBy, sortDirection]);
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
      // Read fresh searchParams from window.location to avoid stale closure state
      const params = new URLSearchParams(window.location.search);

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

      const newURL = params.toString() ? `/browse?${params.toString()}` : "/browse";
      router.replace(newURL, { scroll: false });
    }, 50);
  }, [router]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Debounced search handler for typeahead
  const handleSearchInput = (value: string) => {
    setLocalSearchQuery(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      const { selectedCategories: cats, sortBy: sort, sortDirection: dir } = filterStateRef.current;
      updateURL(cats, sort, dir, value);
    }, 300); // 300ms debounce for typeahead
  };

  // Form submit handler for Enter key (instant, no debounce)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
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
    <div className="flex items-center gap-2">
      {/* Search Bar - grows but capped to keep controls within grid width */}
      <div className="flex-1 min-w-0">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
            <input
              type="text"
              placeholder="Search plugins, keywords, creators..."
              value={localSearchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-border rounded-lg text-sm bg-card text-foreground"
            />
            {localSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  setLocalSearchQuery("");
                  updateURL(selectedCategories, sortBy, sortDirection, "");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary cursor-pointer"
              >
                <X size={16} />
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
        placeholder="Categories"
      />

      {/* Sort Dropdown */}
      <SortDropdown
        sortField={sortBy}
        sortDirection={sortDirection}
        onSortFieldChange={handleSortChange}
        onSortDirectionChange={handleSortDirectionChange}
      />
    </div>
  );
}
