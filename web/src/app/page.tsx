"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Package, Terminal, Sparkles } from "lucide-react";
import { PluginCard, PluginCardCompact } from "@/components";
import type { FlatPlugin, SortOption, Meta } from "@/lib/types";
import {
  sortPlugins,
  filterByCategory,
  formatNumber,
  getUniqueCategories,
} from "@/lib/data";

interface PluginsData {
  meta: Meta;
  plugins: FlatPlugin[];
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageLoading() {
  return (
    <div className="container py-12">
      <div className="flex items-center justify-center">
        <div className="animate-pulse text-[var(--foreground-muted)]">
          Loading...
        </div>
      </div>
    </div>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || "";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [allPlugins, setAllPlugins] = useState<FlatPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("stars");

  // Load pre-built plugins data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/data/plugins.json");
        const data: PluginsData = await res.json();
        setMeta(data.meta);
        setAllPlugins(data.plugins);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter and sort plugins
  const filteredPlugins = useMemo(() => {
    let result = allPlugins;

    // Filter by category
    if (categoryFilter !== "all") {
      result = filterByCategory(result, categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.owner_id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allPlugins, categoryFilter, searchQuery]);

  const sortedPlugins = useMemo(() => {
    return sortPlugins(filteredPlugins, sortBy);
  }, [filteredPlugins, sortBy]);

  // Get new & recently updated plugins
  const recentPlugins = useMemo(() => {
    return [...allPlugins]
      .sort(
        (a, b) =>
          new Date(b.signals.pushed_at).getTime() -
          new Date(a.signals.pushed_at).getTime()
      )
      .slice(0, 8);
  }, [allPlugins]);

  const categories = useMemo(() => {
    return getUniqueCategories(allPlugins);
  }, [allPlugins]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-[var(--foreground-muted)]">
            Loading plugins...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Stats Bar */}
      {meta && (
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8 py-4 px-6 bg-[var(--background-secondary)] rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-semibold">
              {formatNumber(meta.total_plugins)}
            </span>
            <span className="text-[var(--foreground-secondary)]">plugins</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-semibold">
              {formatNumber(meta.total_commands)}
            </span>
            <span className="text-[var(--foreground-secondary)]">commands</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-semibold">
              {formatNumber(meta.total_skills)}
            </span>
            <span className="text-[var(--foreground-secondary)]">skills</span>
          </div>
        </div>
      )}

      {/* New & Recently Updated Section */}
      {!searchQuery && categoryFilter === "all" && (
        <section className="mb-12">
          <div className="section-header">
            <h2 className="section-title">New & Recently Updated</h2>
            <button className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {recentPlugins.map((plugin) => (
              <PluginCardCompact
                key={`${plugin.owner_id}-${plugin.name}`}
                plugin={plugin}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Plugins Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="section-title">
            {searchQuery
              ? `Search results for "${searchQuery}"`
              : categoryFilter && categoryFilter !== "all"
              ? `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} Plugins`
              : "All Plugins"}
          </h2>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-muted)]">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 text-sm bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)]"
              >
                <option value="stars">Stars</option>
                <option value="forks">Forks</option>
                <option value="recent">Recently Updated</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-muted)]">
                Category:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  if (e.target.value === "all") {
                    url.searchParams.delete("category");
                  } else {
                    url.searchParams.set("category", e.target.value);
                  }
                  window.history.pushState({}, "", url);
                  window.location.reload();
                }}
                className="px-3 py-1.5 text-sm bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg outline-none focus:border-[var(--accent)]"
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          {sortedPlugins.length} plugin{sortedPlugins.length !== 1 ? "s" : ""}
        </p>

        {/* Plugin Grid */}
        {sortedPlugins.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedPlugins.map((plugin) => (
              <PluginCard
                key={`${plugin.owner_id}-${plugin.name}`}
                plugin={plugin}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--foreground-muted)]">
              No plugins found matching your criteria.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
