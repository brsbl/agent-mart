"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Terminal, Sparkles } from "lucide-react";
import { PluginCard, PluginCardCompact, LoadingState, ErrorState } from "@/components";
import { useFetch } from "@/hooks";
import type { BrowsePlugin, Meta } from "@/lib/types";
import {
  sortPlugins,
  formatNumber,
  groupPluginsByCategory,
} from "@/lib/data";
import { DATA_URLS, MAX_CATEGORY_PLUGINS } from "@/lib/constants";

interface PluginsData {
  meta: Meta;
  plugins: BrowsePlugin[];
}

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

  const { data, loading, error } = useFetch<PluginsData>(
    DATA_URLS.PLUGINS_BROWSE,
    "Failed to load plugins. Please try refreshing the page."
  );

  const meta = data?.meta ?? null;
  const allPlugins = useMemo(() => data?.plugins ?? [], [data?.plugins]);

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();
    const filtered = allPlugins.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.owner_id.toLowerCase().includes(query)
    );
    return sortPlugins(filtered, "stars");
  }, [allPlugins, searchQuery]);

  // Get new & recently updated plugins
  const recentPlugins = useMemo(() => {
    return [...allPlugins]
      .sort(
        (a, b) =>
          new Date(b.signals.pushed_at).getTime() -
          new Date(a.signals.pushed_at).getTime()
      )
      .slice(0, MAX_CATEGORY_PLUGINS);
  }, [allPlugins]);

  // Group plugins by category
  const categoryGroups = useMemo(() => {
    return groupPluginsByCategory(allPlugins);
  }, [allPlugins]);

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
            {searchResults.length} plugin{searchResults.length !== 1 ? "s" : ""} found
          </p>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((plugin) => (
                <PluginCard
                  key={`${plugin.owner_id}-${plugin.name}`}
                  plugin={plugin}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[var(--foreground-muted)]">
                No plugins found matching your search.
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Browse view (category sections)
  return (
    <div className="container py-8">
      {/* Stats Bar */}
      {meta && (
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8 py-4 px-6 bg-[var(--background-secondary)] rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_plugins)}
            </span>
            <span className="text-[var(--foreground-secondary)]">plugins</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_commands)}
            </span>
            <span className="text-[var(--foreground-secondary)]">commands</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-semibold">
              {formatNumber(meta.total_skills)}
            </span>
            <span className="text-[var(--foreground-secondary)]">skills</span>
          </div>
        </div>
      )}

      {/* Recently Updated Section */}
      <CategorySection
        title="Recently Updated"
        plugins={recentPlugins}
      />

      {/* Category Sections */}
      {categoryGroups.map((group) => (
        <CategorySection
          key={group.category}
          title={group.displayName}
          count={group.plugins.length}
          plugins={group.plugins.slice(0, MAX_CATEGORY_PLUGINS)}
        />
      ))}
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  count?: number;
  plugins: BrowsePlugin[];
}

function CategorySection({ title, count, plugins }: CategorySectionProps) {
  if (plugins.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-normal text-[var(--foreground-muted)]">
              ({count})
            </span>
          )}
        </h2>
      </div>
      <div className="category-scroll">
        {plugins.map((plugin) => (
          <PluginCardCompact
            key={`${plugin.owner_id}-${plugin.name}`}
            plugin={plugin}
          />
        ))}
      </div>
    </section>
  );
}
