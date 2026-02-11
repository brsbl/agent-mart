"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MarketplaceCard, LoadingState, ErrorState, ErrorBoundary } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, MarketplacesData, MarketplaceSortOption, Category } from "@/lib/types";
import { sortMarketplaces, getCategoryDisplay } from "@/lib/data";
import { DATA_URLS, INITIAL_DISPLAY_COUNT, LOAD_MORE_COUNT } from "@/lib/constants";

export default function BrowsePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <BrowsePageContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  // Read filter state from URL (single dimension: ?cat=testing,devops)
  const catParam = searchParams.get("cat") || "";
  // Categories are now dynamic strings from data
  const selectedCategories = useMemo(
    () => (catParam ? catParam.split(",").filter(Boolean) : []) as Category[],
    [catParam]
  );
  const validSorts: MarketplaceSortOption[] = ["popular", "trending", "recent"];
  const rawSort = searchParams.get("sort");
  const sortBy: MarketplaceSortOption = validSorts.includes(rawSort as MarketplaceSortOption)
    ? (rawSort as MarketplaceSortOption)
    : "trending";
  const validDirs = ["asc", "desc"] as const;
  const rawDir = searchParams.get("dir");
  const sortDirection = validDirs.includes(rawDir as typeof validDirs[number]) ? (rawDir as "asc" | "desc") : "desc";

  // State for pagination
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset pagination when search query or filters change
  const sortParam = searchParams.get("sort") || "";
  const dirParam = searchParams.get("dir") || "";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination when URL params change is valid
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [searchQuery, catParam, sortParam, dirParam]);

  // Fetch only marketplaces data
  const { data: marketplacesData, loading, error } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplaces."
  );

  const allMarketplaces = useMemo(() => {
    const marketplaces = marketplacesData?.marketplaces ?? [];
    // Dedupe by repo_full_name to avoid duplicate key errors
    const seen = new Set<string>();
    return marketplaces.filter(m => {
      const key = m.repo_full_name || `${m.author_id}-${m.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [marketplacesData?.marketplaces]);

  // Combined filter and sort for marketplaces (search + categories + sort)
  const filteredAndSortedMarketplaces = useMemo(() => {
    let result = allMarketplaces;

    // 1. Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.author_id.toLowerCase().includes(query) ||
        m.author_display_name.toLowerCase().includes(query) ||
        (Array.isArray(m.keywords) && m.keywords.some(k => k.toLowerCase().includes(query))) ||
        (Array.isArray(m.categories) && m.categories.some(c =>
          c.toLowerCase().includes(query) || getCategoryDisplay(c).toLowerCase().includes(query)
        ))
      );
    }

    // 2. Apply categories filter (OR logic - must have ANY of the selected categories)
    if (selectedCategories.length > 0) {
      result = result.filter(m =>
        Array.isArray(m.categories) && selectedCategories.some(cat =>
          m.categories.includes(cat)
        )
      );
    }

    // 3. Apply sort
    let sorted = sortMarketplaces(result, sortBy);

    // Apply sort direction (sortMarketplaces defaults to desc, so reverse for asc)
    if (sortDirection === "asc") {
      sorted = [...sorted].reverse();
    }

    return sorted;
  }, [allMarketplaces, searchQuery, selectedCategories, sortBy, sortDirection]);

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

  const hasActiveFilters = selectedCategories.length > 0;

  // Helper to render marketplace cards consistently
  const renderMarketplaceCard = (marketplace: BrowseMarketplace) => (
    <MarketplaceCard
      key={marketplace.repo_full_name || `${marketplace.author_id}-${marketplace.name}`}
      marketplace={{
        name: marketplace.name,
        description: marketplace.description,
        categories: marketplace.categories ?? [],
        repo_full_name: marketplace.repo_full_name ?? undefined,
        signals: {
          stars: marketplace.signals?.stars ?? 0,
          forks: marketplace.signals?.forks ?? 0,
          pushed_at: marketplace.signals?.pushed_at ?? null,
          stars_gained_7d: marketplace.signals?.stars_gained_7d,
        },
      }}
      author_id={marketplace.author_id}
      author_display_name={marketplace.author_display_name}
      author_avatar_url={marketplace.author_avatar_url}
      showTrendingBadge={sortBy === "trending"}
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

  // Unified view for both search and browse
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header - show search context when searching */}
      {searchQuery.trim() && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Results for &quot;{searchQuery}&quot;
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAndSortedMarketplaces.length} result{filteredAndSortedMarketplaces.length !== 1 ? "s" : ""} found
            {selectedCategories.length > 0 && ` in selected categories`}
          </p>
        </div>
      )}

      {/* Grid */}
      {displayedMarketplaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMarketplaces.map(renderMarketplaceCard)}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery.trim()
              ? "No results found matching your search."
              : "No plugins found matching your criteria."}
          </p>
          {(hasActiveFilters || searchQuery.trim()) && (
            <p className="mt-2 text-sm text-gray-400">
              Try adjusting your {searchQuery.trim() ? "search terms or " : ""}category filters.
            </p>
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
            className="px-6 py-2.5 bg-card hover:bg-card-hover text-foreground-secondary rounded-lg transition-colors border border-border hover:border-border-hover"
          >
            See more ({remainingCount} remaining)
          </button>
        </div>
      )}

    </div>
  );
}
