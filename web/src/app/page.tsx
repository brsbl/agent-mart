"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Users, Store } from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState, SortDropdown, CategoryPill } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, Meta, MarketplaceSortOption, CategoryVerb } from "@/lib/types";
import { formatNumber, sortMarketplaces, VERB_ORDER, getVerbDisplay } from "@/lib/data";
import { DATA_URLS } from "@/lib/constants";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

const INITIAL_DISPLAY_COUNT = 12;
const LOAD_MORE_COUNT = 12;

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  // State for sorting, filtering, and pagination
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("recent");
  const [selectedVerb, setSelectedVerb] = useState<CategoryVerb | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Track search query changes to reset pagination - using state instead of effect
  const [lastSearchQuery, setLastSearchQuery] = useState(searchQuery);
  if (lastSearchQuery !== searchQuery) {
    setLastSearchQuery(searchQuery);
    if (!searchQuery) {
      setDisplayCount(INITIAL_DISPLAY_COUNT);
    }
  }

  // Fetch only marketplaces data
  const { data: marketplacesData, loading, error } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplaces."
  );

  const meta = marketplacesData?.meta ?? null;
  const allMarketplaces = useMemo(() => marketplacesData?.marketplaces ?? [], [marketplacesData?.marketplaces]);

  // Get unique verbs from all marketplaces, sorted by predefined order
  const availableVerbs = useMemo(() => {
    const verbs = new Set<CategoryVerb>();
    allMarketplaces.forEach(m => m.categories?.verbs?.forEach(v => verbs.add(v)));
    return VERB_ORDER.filter(v => verbs.has(v));
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
      m.keywords?.some(k => k.toLowerCase().includes(query)) ||
      m.categories?.verbs?.some(v => v.toLowerCase().includes(query)) ||
      m.categories?.nouns?.some(n => n.toLowerCase().includes(query))
    );

    return matchedMarketplaces.sort((a, b) => (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0));
  }, [allMarketplaces, searchQuery]);

  // Filter and sort marketplaces for browse view
  const filteredAndSortedMarketplaces = useMemo(() => {
    let result = allMarketplaces;

    // Verb filter
    if (selectedVerb) {
      result = result.filter(m => m.categories?.verbs?.includes(selectedVerb));
    }

    // Sort
    return sortMarketplaces(result, sortBy);
  }, [allMarketplaces, selectedVerb, sortBy]);

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

  // Reset display count when filter changes
  const handleVerbChange = (verb: CategoryVerb | null) => {
    setSelectedVerb(verb);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  const handleSortChange = (newSort: MarketplaceSortOption) => {
    setSortBy(newSort);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };


  // Helper to render marketplace cards consistently
  const renderMarketplaceCard = (marketplace: BrowseMarketplace) => (
    <MarketplaceCard
      key={`${marketplace.author_id}-${marketplace.name}`}
      marketplace={{
        name: marketplace.name,
        description: marketplace.description,
        keywords: marketplace.keywords ?? [],
        categories: marketplace.categories?.verbs ?? [],
        nouns: marketplace.categories?.nouns ?? [],
        integration: marketplace.categories?.integration ?? null,
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
      <div className="container px-4 sm:px-6 py-6 sm:py-8">
        <section>
          <h2 className="section-title mb-4">
            Search results for &quot;{searchQuery}&quot;
          </h2>
          <p className="text-sm text-[var(--foreground-muted)] mb-6">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
          </p>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {searchResults.map(renderMarketplaceCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[var(--foreground-muted)]">
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
    <div className="container px-4 sm:px-6 py-6 sm:py-8">
      {/* Stats Bar */}
      {meta && (
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8 py-4 px-6 bg-[var(--background-secondary)] rounded-lg">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_marketplaces)}
            </span>
            <span className="text-[var(--foreground-secondary)]">marketplaces</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_plugins)}
            </span>
            <span className="text-[var(--foreground-secondary)]">plugins</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_authors)}
            </span>
            <span className="text-[var(--foreground-secondary)]">authors</span>
          </div>
        </div>
      )}

      {/* Marketplaces Section */}
      <section>
        {/* Section Header with Sort */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Marketplaces
            {selectedVerb && (
              <span className="text-[var(--foreground-muted)] font-normal ml-2">
                ({filteredAndSortedMarketplaces.length})
              </span>
            )}
          </h2>
          <SortDropdown value={sortBy} onChange={handleSortChange} />
        </div>

        {/* Verb Filters */}
        {availableVerbs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleVerbChange(null)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedVerb === null
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
              }`}
            >
              All
            </button>
            {availableVerbs.map((verb) => (
              <CategoryPill
                key={verb}
                category={verb}
                size="md"
                isActive={selectedVerb === verb}
                onClick={() => handleVerbChange(selectedVerb === verb ? null : verb)}
              />
            ))}
          </div>
        )}

        {/* Marketplace Grid */}
        {displayedMarketplaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {displayedMarketplaces.map(renderMarketplaceCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--foreground-muted)]">
              No marketplaces found in this category.
            </p>
          </div>
        )}

        {/* Load more - triggers on scroll or button click */}
        {hasMore && (
          <div ref={loadMoreRef} className="text-center mt-8">
            <button
              type="button"
              onClick={() => setDisplayCount(c => c + LOAD_MORE_COUNT)}
              className="px-6 py-2.5 bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] text-[var(--foreground)] rounded-lg transition-colors border border-[var(--border)]"
            >
              See more ({remainingCount} remaining)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
