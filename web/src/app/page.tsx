"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Terminal, Sparkles } from "lucide-react";
import { PluginCard, PluginCardCompact } from "@/components";
import type { FlatPlugin, Meta } from "@/lib/types";
import {
  sortPlugins,
  formatNumber,
  groupPluginsByCategory,
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
  const searchQuery = searchParams.get("q") || "";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [allPlugins, setAllPlugins] = useState<FlatPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pre-built plugins data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/data/plugins.json");
        if (!res.ok) throw new Error("Failed to fetch plugins data");
        const data: PluginsData = await res.json();
        setMeta(data.meta);
        setAllPlugins(data.plugins);
      } catch (error) {
        console.error("Failed to load data:", error);
        setError("Failed to load plugins. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
      .slice(0, 12);
  }, [allPlugins]);

  // Group plugins by category
  const categoryGroups = useMemo(() => {
    return groupPluginsByCategory(allPlugins);
  }, [allPlugins]);

  if (error) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-[var(--foreground-muted)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
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
          plugins={group.plugins.slice(0, 12)}
        />
      ))}
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  count?: number;
  plugins: FlatPlugin[];
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
