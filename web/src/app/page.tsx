"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Users, Store } from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState, SortDropdown, CategoryPill } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, Meta, MarketplaceSortOption, TechStack, Capability } from "@/lib/types";
import { formatNumber, sortMarketplaces, TECH_STACK_ORDER, CAPABILITY_ORDER, getTechStackDisplay, getCapabilityDisplay } from "@/lib/data";
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
  const [selectedTechStack, setSelectedTechStack] = useState<Set<TechStack>>(new Set());
  const [selectedCapabilities, setSelectedCapabilities] = useState<Set<Capability>>(new Set());
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

  // Get unique tech stacks from all marketplaces, sorted by predefined order
  const availableTechStack = useMemo(() => {
    const techs = new Set<TechStack>();
    allMarketplaces.forEach(m => m.categories?.techStack?.forEach(t => techs.add(t)));
    return TECH_STACK_ORDER.filter(t => techs.has(t));
  }, [allMarketplaces]);

  // Get unique capabilities from all marketplaces, sorted by predefined order
  const availableCapabilities = useMemo(() => {
    const caps = new Set<Capability>();
    allMarketplaces.forEach(m => m.categories?.capabilities?.forEach(c => caps.add(c)));
    return CAPABILITY_ORDER.filter(c => caps.has(c));
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
      m.categories?.techStack?.some(t => t.toLowerCase().includes(query) || getTechStackDisplay(t).toLowerCase().includes(query)) ||
      m.categories?.capabilities?.some(c => c.toLowerCase().includes(query) || getCapabilityDisplay(c).toLowerCase().includes(query))
    );

    return matchedMarketplaces.sort((a, b) => (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0));
  }, [allMarketplaces, searchQuery]);

  // Filter and sort marketplaces for browse view
  const filteredAndSortedMarketplaces = useMemo(() => {
    let result = allMarketplaces;

    // Tech stack filter (AND logic - must have ALL selected tech stacks)
    if (selectedTechStack.size > 0) {
      result = result.filter(m =>
        Array.from(selectedTechStack).every(tech =>
          m.categories?.techStack?.includes(tech)
        )
      );
    }

    // Capabilities filter (AND logic - must have ALL selected capabilities)
    if (selectedCapabilities.size > 0) {
      result = result.filter(m =>
        Array.from(selectedCapabilities).every(cap =>
          m.categories?.capabilities?.includes(cap)
        )
      );
    }

    // Sort
    return sortMarketplaces(result, sortBy);
  }, [allMarketplaces, selectedTechStack, selectedCapabilities, sortBy]);

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

  // Toggle tech stack filter
  const handleTechStackToggle = (tech: TechStack) => {
    setSelectedTechStack(prev => {
      const next = new Set(prev);
      if (next.has(tech)) {
        next.delete(tech);
      } else {
        next.add(tech);
      }
      return next;
    });
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Toggle capability filter
  const handleCapabilityToggle = (cap: Capability) => {
    setSelectedCapabilities(prev => {
      const next = new Set(prev);
      if (next.has(cap)) {
        next.delete(cap);
      } else {
        next.add(cap);
      }
      return next;
    });
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTechStack(new Set());
    setSelectedCapabilities(new Set());
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  const handleSortChange = (newSort: MarketplaceSortOption) => {
    setSortBy(newSort);
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  };

  const hasActiveFilters = selectedTechStack.size > 0 || selectedCapabilities.size > 0;

  // Helper to render marketplace cards consistently
  const renderMarketplaceCard = (marketplace: BrowseMarketplace) => (
    <MarketplaceCard
      key={`${marketplace.author_id}-${marketplace.name}`}
      marketplace={{
        name: marketplace.name,
        description: marketplace.description,
        keywords: marketplace.keywords ?? [],
        techStack: marketplace.categories?.techStack ?? [],
        capabilities: marketplace.categories?.capabilities ?? [],
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
            {hasActiveFilters && (
              <span className="text-[var(--foreground-muted)] font-normal ml-2">
                ({filteredAndSortedMarketplaces.length})
              </span>
            )}
          </h2>
          <SortDropdown value={sortBy} onChange={handleSortChange} />
        </div>

        {/* Two-Dimensional Filters */}
        <div className="space-y-3 mb-6">
          {/* Tech Stack Filters */}
          {availableTechStack.length > 0 && (
            <div>
              <div className="text-xs text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Tech Stack</div>
              <div className="flex flex-wrap gap-2">
                {availableTechStack.map((tech) => (
                  <CategoryPill
                    key={tech}
                    category={tech}
                    type="techStack"
                    size="md"
                    isActive={selectedTechStack.has(tech)}
                    onClick={() => handleTechStackToggle(tech)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Capability Filters */}
          {availableCapabilities.length > 0 && (
            <div>
              <div className="text-xs text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">Capabilities</div>
              <div className="flex flex-wrap gap-2">
                {availableCapabilities.map((cap) => (
                  <CategoryPill
                    key={cap}
                    category={cap}
                    type="capability"
                    size="md"
                    isActive={selectedCapabilities.has(cap)}
                    onClick={() => handleCapabilityToggle(cap)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Marketplace Grid */}
        {displayedMarketplaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {displayedMarketplaces.map(renderMarketplaceCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--foreground-muted)]">
              No marketplaces found matching your filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm text-[var(--accent)] hover:underline"
              >
                Clear filters
              </button>
            )}
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
