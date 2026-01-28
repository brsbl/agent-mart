"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MarketplaceCard, LoadingState, ErrorState, ErrorBoundary, SearchFilter } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, Meta, MarketplaceSortOption, Category } from "@/lib/types";
import { sortMarketplaces, getCategoryDisplay } from "@/lib/data";
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
  const searchQuery = searchParams.get("q") || "";

  // Read filter state from URL (single dimension: ?cat=testing,devops)
  const categoriesParam = searchParams.get("cat")?.split(",").filter(Boolean) ?? [];
  // Categories are now dynamic strings from data
  const selectedCategories = categoriesParam as Category[];
  const sortBy = (searchParams.get("sort") as MarketplaceSortOption) || "recent";
  const sortDirection = (searchParams.get("dir") as "asc" | "desc") || "desc";

  // State for pagination
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset pagination when search query or filters change
  const catParam = searchParams.get("cat") || "";
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

  const allMarketplaces = useMemo(() => marketplacesData?.marketplaces ?? [], [marketplacesData?.marketplaces]);

  // Search filter for marketplaces
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
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

  // Search results view - show when there's a search query
  if (searchQuery.trim() && searchResults) {
    return (
      <>
        <SearchFilter />
        <div className="max-w-7xl mx-auto px-6 py-8">
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
      </>
    );
  }

  // Browse view
  return (
    <>
      <SearchFilter />
      <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Grid */}
      {displayedMarketplaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMarketplaces.map(renderMarketplaceCard)}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No plugins found matching your criteria.</p>
          {hasActiveFilters && (
            <p className="mt-2 text-sm text-gray-400">
              Try adjusting your category filters in the navbar.
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
            className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors border border-gray-300 hover:border-gray-400"
          >
            See more ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
    </>
  );
}
