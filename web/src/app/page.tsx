"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Users, Store } from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowseMarketplace, Meta } from "@/lib/types";
import { formatNumber } from "@/lib/data";
import { DATA_URLS } from "@/lib/constants";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

const BROWSE_LIMIT = 20;

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

  // Fetch only marketplaces data
  const { data: marketplacesData, loading, error } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplaces."
  );

  const meta = marketplacesData?.meta ?? null;
  const allMarketplaces = useMemo(() => marketplacesData?.marketplaces ?? [], [marketplacesData?.marketplaces]);

  // Search filter for marketplaces only
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();

    const matchedMarketplaces = allMarketplaces.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query) ||
      m.author_id.toLowerCase().includes(query) ||
      m.author_display_name.toLowerCase().includes(query) ||
      m.keywords?.some(k => k.toLowerCase().includes(query))
    );

    return matchedMarketplaces.sort((a, b) => (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0));
  }, [allMarketplaces, searchQuery]);

  // Sort and limit browse items by pushed_at (most recent first)
  const recentMarketplaces = useMemo(() => {
    return [...allMarketplaces]
      .sort((a, b) => new Date(b.signals.pushed_at ?? 0).getTime() - new Date(a.signals.pushed_at ?? 0).getTime())
      .slice(0, BROWSE_LIMIT);
  }, [allMarketplaces]);

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
      <div className="container py-8">
        <section>
          <h2 className="section-title mb-4">
            Search results for &quot;{searchQuery}&quot;
          </h2>
          <p className="text-sm text-[var(--foreground-muted)] mb-6">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
          </p>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((marketplace) => (
                <MarketplaceCard
                  key={`${marketplace.author_id}-${marketplace.name}`}
                  marketplace={{
                    name: marketplace.name,
                    description: marketplace.description,
                    keywords: marketplace.keywords ?? [],
                    signals: {
                      stars: marketplace.signals?.stars ?? 0,
                      forks: 0,
                    },
                  }}
                  author_id={marketplace.author_id}
                  author_display_name={marketplace.author_display_name}
                  author_avatar_url={marketplace.author_avatar_url}
                />
              ))}
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
    <div className="container py-8">
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

      {/* Recent Marketplaces Section */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Recent Marketplaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {recentMarketplaces.map((marketplace) => (
            <MarketplaceCard
              key={`${marketplace.author_id}-${marketplace.name}`}
              marketplace={{
                name: marketplace.name,
                description: marketplace.description,
                keywords: [],
                signals: {
                  stars: marketplace.signals.stars,
                  forks: 0,
                },
              }}
              author_id={marketplace.author_id}
              author_display_name={marketplace.author_display_name}
              author_avatar_url={marketplace.author_avatar_url}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
