"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Star,
  GitFork,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import {
  PluginCardInline,
  LoadingState,
  ErrorState,
  MarketplaceCard,
} from "@/components";
import { useFetch, useStarredRepos } from "@/hooks";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { AuthorDetail, Marketplace, Category } from "@/lib/types";
import {
  formatNumber,
  getCategoryBadgeClass,
  getCategoryDisplayName,
} from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

// Format relative time (e.g., "2d ago", "3mo ago")
function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

// Terminal-style install command component
function TerminalInstallCommand({ command }: { command: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Terminal header with dots */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700 border-b border-gray-600">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] text-gray-400 font-mono">Add marketplace</span>
      </div>
      {/* Command line */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        <code className="text-green-400 font-mono text-sm flex-1 overflow-x-auto">
          <span className="text-gray-500">$</span> {command}
        </code>
        <button
          type="button"
          onClick={() => copy(command)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Get unique categories from all plugins (max 5 for display)
function getUniqueCategories(marketplace: Marketplace): Category[] {
  const categories = new Set<Category>();
  for (const plugin of marketplace.plugins) {
    for (const cat of plugin.categories ?? []) {
      if (cat) categories.add(cat);
    }
  }
  return Array.from(categories).slice(0, 5);
}

// Find README content from marketplace files
function findReadmeContent(
  files: Record<string, string> | undefined
): string | null {
  if (!files) return null;

  const readmeKey = Object.keys(files).find((k) => {
    const lower = k.toLowerCase();
    return lower.includes("readme") && lower.endsWith(".md");
  });

  return readmeKey ? files[readmeKey] : null;
}

const INITIAL_PLUGINS_VISIBLE = 5;

export default function MarketplaceDetailPage() {
  const params = useParams();
  const authorId = validateUrlParam(params.author);
  const marketplaceName = validateUrlParam(params.marketplace);
  const { isStarred, toggleStar } = useStarredRepos();
  const [showAllPlugins, setShowAllPlugins] = useState(false);

  // Build URL conditionally - null if params are invalid
  const url = authorId ? DATA_URLS.AUTHOR(authorId) : null;

  const {
    data: authorData,
    loading,
    error,
  } = useFetch<AuthorDetail>(url, "Failed to load marketplace data");

  // Find the marketplace by name from author data
  const marketplace: Marketplace | null = useMemo(() => {
    if (!authorData || !marketplaceName) {
      return null;
    }

    return (
      authorData.marketplaces.find((m) => m.name === marketplaceName) ?? null
    );
  }, [authorData, marketplaceName]);

  // Get other marketplaces from the same author
  const otherMarketplaces = useMemo(() => {
    if (!authorData || !marketplaceName) {
      return [];
    }
    return authorData.marketplaces
      .filter((m) => m.name !== marketplaceName)
      .slice(0, 3);
  }, [authorData, marketplaceName]);

  // Generate install command for the entire marketplace
  const installCommand = useMemo(() => {
    if (!marketplace) {
      return "";
    }

    return `/plugin marketplace add ${marketplace.repo_full_name}`;
  }, [marketplace]);

  // Get unique categories from all plugins
  const uniqueCategories = useMemo(() => {
    if (!marketplace) return [];
    return getUniqueCategories(marketplace);
  }, [marketplace]);

  // Get README content
  const readmeContent = useMemo(() => {
    if (!marketplace) return null;
    return findReadmeContent(marketplace.files);
  }, [marketplace]);

  const repoId = marketplace?.repo_full_name || "";
  const starred = isStarred(repoId);

  const handleStarClick = () => {
    if (repoId) {
      toggleStar(repoId);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  // Handle invalid URL params
  if (!authorId || !marketplaceName) {
    return (
      <ErrorState
        title="Marketplace Not Found"
        message="Invalid URL parameters"
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  if (error || !authorData || !marketplace) {
    return (
      <ErrorState
        title="Marketplace Not Found"
        message={error || "This marketplace does not exist."}
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  const { author } = authorData;
  const hasOtherMarketplaces = otherMarketplaces.length > 0;
  const plugins = marketplace.plugins;
  const visiblePlugins = showAllPlugins
    ? plugins
    : plugins.slice(0, INITIAL_PLUGINS_VISIBLE);
  const hiddenPluginsCount = plugins.length - INITIAL_PLUGINS_VISIBLE;

  return (
    <div className="px-6 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Two-column layout: Main (left) + Sidebar (right) */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
          {/* Main Column - Hero, Terminal, README */}
          <div>
            {/* Hero Header - glass */}
            <div className="glass-card border border-white/50 dark:border-gray-600 rounded-2xl p-6 mb-6 shadow-xl">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Image
                  src={author.avatar_url}
                  alt={author.display_name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700 flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {marketplace.name}
                    </h1>
                    {marketplace.version && (
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
                        v{marketplace.version}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                    @{author.id}
                  </p>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    {marketplace.description || "No description"}
                  </p>

                  {/* Category Pills */}
                  {uniqueCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {uniqueCategories.map((cat) => (
                        <span
                          key={cat}
                          className={`badge ${getCategoryBadgeClass(cat)}`}
                        >
                          {getCategoryDisplayName(cat)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <button
                      type="button"
                      onClick={handleStarClick}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                      aria-label={
                        starred ? "Unstar this repository" : "Star this repository"
                      }
                    >
                      <Star
                        size={14}
                        className={starred ? "text-yellow-500" : ""}
                        fill={starred ? "currentColor" : "none"}
                      />
                      {formatNumber(marketplace.signals.stars)}
                    </button>
                    <span className="flex items-center gap-1.5">
                      <GitFork size={14} />
                      {formatNumber(marketplace.signals.forks)}
                    </span>
                    {marketplace.signals.pushed_at && (
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        Updated {formatRelativeTime(marketplace.signals.pushed_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* GitHub button */}
                <a
                  href={marketplace.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex-shrink-0"
                >
                  <span>View on GitHub</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Terminal Install Command */}
            <div className="mb-6">
              <TerminalInstallCommand command={installCommand} />
            </div>

            {/* README Section */}
            {readmeContent && (
              <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    README
                  </h2>
                </div>
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none max-h-[48rem] overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {readmeContent}
                  </ReactMarkdown>
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar - Plugins + More from Author */}
          <aside className="mt-8 lg:mt-0 space-y-6">
            {/* Plugins Section */}
            {plugins.length > 0 && (
              <section className="glass-card border border-white/50 dark:border-gray-600 rounded-2xl p-4 shadow-lg">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  Plugins
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    {plugins.length}
                  </span>
                </h2>

                {/* Plugin List - single column in sidebar */}
                <div className="space-y-3">
                  {visiblePlugins.map((plugin) => (
                    <PluginCardInline
                      key={plugin.name}
                      plugin={{
                        name: plugin.name,
                        description: plugin.description,
                        version: plugin.version,
                        keywords: plugin.keywords,
                        categories: plugin.categories,
                        install_command: `/plugin install ${plugin.name}@${marketplace.repo_full_name.replace("/", "-")}`,
                      }}
                    />
                  ))}
                </div>

                {/* Show more/less button */}
                {hiddenPluginsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPlugins(!showAllPlugins)}
                    className="w-full mt-4 py-2 px-3 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {showAllPlugins ? (
                      <>
                        Show less
                        <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        Show {hiddenPluginsCount} more
                        <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                )}
              </section>
            )}

            {/* More from Author */}
            {hasOtherMarketplaces && (
              <section className="glass-card border border-white/50 dark:border-gray-600 rounded-2xl p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  More from @{author.id}
                </h3>
                <div className="space-y-3">
                  {otherMarketplaces.map((m) => (
                    <MarketplaceCard
                      key={m.name}
                      marketplace={m}
                      author_id={author.id}
                      author_display_name={author.display_name}
                      author_avatar_url={author.avatar_url}
                    />
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
