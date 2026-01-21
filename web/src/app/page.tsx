"use client";

import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState, ErrorBoundary, MultiSelectDropdown, SortDropdown } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, Meta, MarketplaceSortOption, Category } from "@/lib/types";
import { sortMarketplaces, CATEGORY_ORDER, getCategoryDisplay } from "@/lib/data";
import { DATA_URLS, INITIAL_DISPLAY_COUNT, LOAD_MORE_COUNT } from "@/lib/constants";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <HomePageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get("q") || "";
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Read filter state from URL (single dimension: ?cat=testing,devops)
  const categoriesParam = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
  const validCategories = categoriesParam.filter(
    (c): c is Category => CATEGORY_ORDER.includes(c as Category)
  );
  const sortByParam = (searchParams.get("sort") as MarketplaceSortOption) || "recent";
  const sortDirParam = (searchParams.get("dir") as "asc" | "desc") || "desc";

  // State for sorting, filtering, and pagination
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>(sortByParam);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(sortDirParam);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(validCategories);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(localSearchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  // Reset pagination when search query changes - valid use case for URL sync
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination when URL query changes
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [searchQuery]);

  // Sync state from URL on browser navigation (back/forward buttons)
  useEffect(() => {
    const cats = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
    const validCats = cats.filter((c): c is Category =>
      CATEGORY_ORDER.includes(c as Category)
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from URL on browser navigation
    setSelectedCategories(validCats);
    setSortBy((searchParams.get("sort") as MarketplaceSortOption) || "recent");
    setSortDirection((searchParams.get("dir") as "asc" | "desc") || "desc");
  }, [searchParams]);

  // Debounced URL update to prevent rapid history entries
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateURL = useCallback((
    cats: Category[],
    sort: MarketplaceSortOption,
    dir: "asc" | "desc"
  ) => {
    // Clear any pending URL update
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Update categories param
      if (cats.length > 0) {
        params.set("cat", cats.join(","));
      } else {
        params.delete("cat");
      }

      // Update sort param (only if not default)
      if (sort !== "recent") {
        params.set("sort", sort);
      } else {
        params.delete("sort");
      }

      // Update sortDirection param (only if not default)
      if (dir !== "desc") {
        params.set("dir", dir);
      } else {
        params.delete("dir");
      }

      const newURL = params.toString() ? `?${params.toString()}` : "/";
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

  // Fetch only marketplaces data
  const { data: marketplacesData, loading, error } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplaces."
  );

  const allMarketplaces = useMemo(() => marketplacesData?.marketplaces ?? [], [marketplacesData?.marketplaces]);

  // Get unique categories from all marketplaces, sorted by predefined order
  const availableCategories = useMemo(() => {
    const cats = new Set<Category>();
    allMarketplaces.forEach(m => {
      if (Array.isArray(m.categories)) {
        m.categories.forEach(c => cats.add(c));
      }
    });
    return CATEGORY_ORDER.filter(c => cats.has(c));
  }, [allMarketplaces]);

  // Search filter for marketplaces only
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();

    const matchedMarketplaces = allMarketplaces.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.author_id.toLowerCase().includes(query) ||
      m.author_display_name.toLowerCase().includes(query) ||
      (Array.isArray(m.keywords) && m.keywords.some(k => k.toLowerCase().includes(query))) ||
      (Array.isArray(m.categories) && m.categories.some(c => c.toLowerCase().includes(query) || getCategoryDisplay(c).toLowerCase().includes(query)))
    );

    return matchedMarketplaces.sort((a, b) => (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0));
  }, [allMarketplaces, searchQuery]);

  // Filter and sort marketplaces for browse view
  const filteredAndSortedMarketplaces = useMemo(() => {
    let result = allMarketplaces;

    // Categories filter (OR logic - must have ANY of the selected categories)
    if (selectedCategories.length > 0) {
      result = result.filter(m =>
        Array.isArray(m.categories) && selectedCategories.some(cat =>
          m.categories.includes(cat)
        )
      );
    }

    // Sort
    let sorted = sortMarketplaces(result, sortBy);

    // Apply sort direction (sortMarketplaces defaults to desc, so reverse for asc)
    if (sortDirection === "asc") {
      sorted = [...sorted].reverse();
    }

    return sorted;
  }, [allMarketplaces, selectedCategories, sortBy, sortDirection]);

  const displayedMarketplaces = filteredAndSortedMarketplaces.slice(0, displayCount);
  const hasMore = displayCount < filteredAndSortedMarketplaces.length;
  const remainingCount = filteredAndSortedMarketplaces.length - displayCount;

  // Infinite scroll - load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(c => c + LOAD_MORE_COUNT);
        }
      },
      { rootMargin: '100px' } // Trigger 100px before reaching bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // Toggle category filter
  const handleCategoryToggle = (cat: Category) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat];
      updateURL(next, sortBy, sortDirection);
      return next;
    });
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
    updateURL([], sortBy, sortDirection);
  };

  const handleSortChange = (newSort: MarketplaceSortOption) => {
    setSortBy(newSort);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
    updateURL(selectedCategories, newSort, sortDirection);
  };

  const handleSortDirectionChange = (newDir: "asc" | "desc") => {
    setSortDirection(newDir);
    updateURL(selectedCategories, sortBy, newDir);
  };

  const hasActiveFilters = selectedCategories.length > 0;

  // Helper to render marketplace cards consistently
  const renderMarketplaceCard = (marketplace: BrowseMarketplace) => (
    <MarketplaceCard
      key={`${marketplace.author_id}-${marketplace.name}`}
      marketplace={{
        name: marketplace.name,
        description: marketplace.description,
        keywords: marketplace.keywords ?? [],
        categories: marketplace.categories ?? [],
        repo_full_name: marketplace.repo_full_name ?? undefined,
        signals: {
          stars: marketplace.signals?.stars ?? 0,
          forks: marketplace.signals?.forks ?? 0,
          pushed_at: marketplace.signals?.pushed_at ?? null,
        },
      }}
      author_id={marketplace.author_id}
      author_display_name={marketplace.author_display_name}
      author_avatar_url={marketplace.author_avatar_url}
    />
  );

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        title="Something went wrong"
        message={error}
        action={{
          label: "Try Again",
          onClick: () => window.location.reload(),
        }}
      />
    );
  }

  // Search results view
  if (searchQuery && searchResults) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search repositories..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent bg-white/80"
            />
          </div>
        </form>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Search results for &quot;{searchQuery}&quot;
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
          </p>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map(renderMarketplaceCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No results found matching your search.
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Browse view
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Single Row with Search, Category, Sort */}
      <div className="flex items-center gap-3 mb-8">
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
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent bg-white"
              />
              {localSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLocalSearchQuery("")}
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
          options={availableCategories}
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

      {/* Grid */}
      {displayedMarketplaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMarketplaces.map(renderMarketplaceCard)}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No plugins found matching your criteria.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm text-green-700 hover:text-green-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Screen reader announcement for filter changes */}
      <span className="sr-only" aria-live="polite">
        {displayedMarketplaces.length} of {filteredAndSortedMarketplaces.length} marketplaces shown
      </span>

      {/* Load more - triggers on scroll or button click */}
      {hasMore && (
        <div ref={loadMoreRef} className="text-center mt-8">
          <button
            type="button"
            onClick={() => setDisplayCount(c => c + LOAD_MORE_COUNT)}
            className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors border border-gray-300 hover:border-gray-400"
          >
            See more ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
