"use client";

import { Suspense, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowDownUp, X } from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState, ErrorBoundary, CategoryPill } from "@/components";
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

  // State for sorting, filtering, and pagination
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>(sortByParam);
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(
    () => new Set(validCategories)
  );
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
    setSelectedCategories(new Set(validCats));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from URL on browser navigation
    setSortBy((searchParams.get("sort") as MarketplaceSortOption) || "recent");
  }, [searchParams]);

  // Debounced URL update to prevent rapid history entries
  const urlUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateURL = useCallback((
    cats: Set<Category>,
    sort: MarketplaceSortOption
  ) => {
    // Clear any pending URL update
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current);
    }

    urlUpdateTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Update categories param
      if (cats.size > 0) {
        params.set("cat", Array.from(cats).join(","));
      } else {
        params.delete("cat");
      }

      // Update sort param (only if not default)
      if (sort !== "recent") {
        params.set("sort", sort);
      } else {
        params.delete("sort");
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
    if (selectedCategories.size > 0) {
      result = result.filter(m =>
        Array.isArray(m.categories) && Array.from(selectedCategories).some(cat =>
          m.categories.includes(cat)
        )
      );
    }

    // Sort
    return sortMarketplaces(result, sortBy);
  }, [allMarketplaces, selectedCategories, sortBy]);

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
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      updateURL(next, sortBy);
      return next;
    });
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories(new Set());
    setDisplayCount(INITIAL_DISPLAY_COUNT);
    updateURL(new Set(), sortBy);
  };

  const handleSortChange = (newSort: MarketplaceSortOption) => {
    setSortBy(newSort);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
    updateURL(selectedCategories, newSort);
  };

  const hasActiveFilters = selectedCategories.size > 0;

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
      {/* Search and Filters - Modern Layout */}
      <div className="mb-8 space-y-4">
        {/* Search Bar - Full Width, Most Prominent */}
        <form onSubmit={handleSearch}>
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

        {/* Filters Row - Categories as Pills + Sort Dropdown */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Category Pills */}
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by category">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryToggle(cat)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  selectedCategories.has(cat)
                    ? "bg-gray-900 text-white border border-gray-900 hover:bg-gray-800 hover:border-gray-800 active:bg-gray-700 active:border-gray-700"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {getCategoryDisplay(cat)}
              </button>
            ))}
            {/* Clear filters button - only shown when filters are active */}
            {selectedCategories.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories(new Set());
                  setDisplayCount(INITIAL_DISPLAY_COUNT);
                  updateURL(new Set(), sortBy);
                }}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                aria-label="Clear all filters"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Sort Dropdown - Compact */}
          <div className="flex items-center gap-2">
            <ArrowDownUp size={16} className="text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as MarketplaceSortOption)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white cursor-pointer hover:border-gray-400 transition-colors"
            >
              <option value="popular">Most Popular</option>
              <option value="trending">Most Trending</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
        </div>
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
