"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  Star,
  GitFork,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  PluginCardInline,
  LoadingState,
  ErrorState,
  MarketplaceCard,
  InstallCommand,
} from "@/components";
import { useFetch } from "@/hooks";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { AuthorDetail, Marketplace, Category } from "@/lib/types";

// Custom sanitize schema that matches GitHub's markdown rendering
// Allows: external images, picture/source elements, sizing attributes
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "picture",
    "source",
  ],
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "height",
      "width",
      "align",
    ],
    source: ["media", "srcset", "type"],
    // Allow align on block elements for centering (GitHub supports this)
    p: [...(defaultSchema.attributes?.p ?? []), "align"],
    h1: [...(defaultSchema.attributes?.h1 ?? []), "align"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "align"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "align"],
    div: [...(defaultSchema.attributes?.div ?? []), "align"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https", "data"],
    srcset: ["http", "https"],
  },
};
import {
  formatNumber,
  formatRelativeTime,
  getCategoryBadgeClass,
  getCategoryDisplayName,
} from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

// Terminal-style install command component
function TerminalInstallCommand({ command }: { command: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="bg-terminal-bg dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Terminal header */}
      <div className="px-3 py-1 bg-card/10 border-b border-white/15 dark:bg-gray-900">
        <span className="text-[10px] text-terminal-text font-mono opacity-60 dark:opacity-80">Add marketplace</span>
      </div>
      {/* Command line */}
      <div className="px-3 py-2 flex items-center justify-between gap-3">
        <code className="text-terminal-text font-mono text-sm flex-1 overflow-x-auto">
          <span className="opacity-50">$</span> {command}
        </code>
        <button
          type="button"
          onClick={() => copy(command)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-terminal-text bg-white/10 hover:bg-white/20 rounded transition-colors flex-shrink-0 cursor-pointer"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" />
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

// Get README content for a specific plugin
function getPluginReadme(
  files: Record<string, string> | undefined,
  pluginName: string
): string | null {
  if (!files || !pluginName) return null;

  const pluginLower = pluginName.toLowerCase();

  // 1. First: README in .claude-plugin folder (plugin-specific or general)
  let key = Object.keys(files).find((k) => {
    const lower = k.toLowerCase();
    return lower.startsWith(".claude-plugin/") &&
      lower.endsWith("readme.md") &&
      (lower.includes(`/${pluginLower}/`) || !lower.includes("/plugins/"));
  });

  // 2. Second: Plugin-specific README
  if (!key) {
    key = Object.keys(files).find((k) => {
      const lower = k.toLowerCase();
      return (
        (lower.includes(`plugins/${pluginLower}/readme`) ||
          lower.includes(`/${pluginLower}/readme`)) &&
        lower.endsWith(".md")
      );
    });
  }

  // 3. Last: Root README.md only
  if (!key) {
    key = Object.keys(files).find((k) => k.toLowerCase() === "readme.md");
  }

  return key ? files[key] : null;
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const authorId = validateUrlParam(params.author);
  const marketplaceName = validateUrlParam(params.marketplace);
  const [selectedPluginIndex, setSelectedPluginIndex] = useState(0);

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

  // Scroll to top when navigating to a new marketplace
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [authorId, marketplaceName]);

  // Reset selected plugin index when marketplace changes
  useEffect(() => {
    setSelectedPluginIndex(0);
  }, [marketplace?.name]);

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

  // Get plugins array
  const plugins = useMemo(() => marketplace?.plugins ?? [], [marketplace]);

  // Get README for currently selected plugin
  const currentPluginReadme = useMemo(() => {
    if (!marketplace || plugins.length === 0) return null;
    return getPluginReadme(marketplace.files, plugins[selectedPluginIndex]?.name);
  }, [marketplace, plugins, selectedPluginIndex]);

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
  const currentPlugin = plugins[selectedPluginIndex];

  const handlePrevPlugin = () => {
    setSelectedPluginIndex((prev) =>
      prev === 0 ? plugins.length - 1 : prev - 1
    );
  };

  const handleNextPlugin = () => {
    setSelectedPluginIndex((prev) => (prev + 1) % plugins.length);
  };

  return (
    <div className="px-6 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Two-column layout: Main (left) + Sidebar (right), or centered if no sidebar */}
        <div className={hasOtherMarketplaces
          ? "lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:pl-12"
          : "max-w-3xl mx-auto"}>
          {/* Main Column - Hero, Terminal, README */}
          <div className="min-w-0">
            {/* Hero Header - glass */}
            <div className="glass-card border border-border rounded-2xl p-6 mb-6 shadow-xl">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Image
                  src={author.avatar_url}
                  alt={author.display_name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl border border-border flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">
                      {marketplace.name}
                    </h1>
                    {marketplace.version && (
                      <span className="px-2 py-0.5 text-xs font-medium text-foreground-secondary bg-background-secondary rounded">
                        v{marketplace.version}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-foreground-muted font-mono mt-0.5">
                    @{author.id}
                  </p>

                  <p className="text-sm text-foreground-secondary mt-3">
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
                  <div className="flex items-center gap-4 mt-4 text-sm font-medium text-foreground-secondary">
                    <span className="flex items-center gap-1.5">
                      <Star size={14} className="text-yellow-500" fill="currentColor" />
                      {formatNumber(marketplace.signals.stars)}
                      {marketplace.signals.stars_gained_7d != null && marketplace.signals.stars_gained_7d > 0 && (
                        <sup
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                          title={`+${formatNumber(marketplace.signals.stars_gained_7d)} stars this week`}
                        >
                          <TrendingUp size={12} />
                          {formatNumber(marketplace.signals.stars_gained_7d)}
                        </sup>
                      )}
                    </span>
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground-secondary bg-card border border-border rounded-lg hover:bg-background-secondary hover:border-border-hover transition-colors flex-shrink-0"
                >
                  <span>View on GitHub</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Terminal Install Command */}
            <div className="flex items-center -mx-6 mb-6">
              <div className="w-8 flex-shrink-0" />
              <div className="flex-1">
                <TerminalInstallCommand command={installCommand} />
              </div>
              <div className="w-8 flex-shrink-0" />
            </div>

            {/* Plugin Carousel */}
            {plugins.length > 0 && currentPlugin && (
              <div className="mb-6 mt-10">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  Plugins
                  <span className="px-2 py-0.5 text-xs font-medium bg-card/60 backdrop-blur-sm text-foreground rounded-full border border-border">
                    {plugins.length}
                  </span>
                </h2>
                <div className="flex items-center -mx-6">
                  {/* Left arrow */}
                  {plugins.length > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevPlugin}
                      className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-full transition-colors flex-shrink-0 cursor-pointer"
                      aria-label="Previous plugin"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
                  {/* Plugin card */}
                  <div className="flex-1">
                    <PluginCardInline
                      plugin={{
                        name: currentPlugin.name,
                        description: currentPlugin.description,
                        version: currentPlugin.version,
                        keywords: currentPlugin.keywords,
                        categories: currentPlugin.categories,
                      }}
                    />
                  </div>
                  {/* Right arrow */}
                  {plugins.length > 1 ? (
                    <button
                      type="button"
                      onClick={handleNextPlugin}
                      className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-full transition-colors flex-shrink-0 cursor-pointer"
                      aria-label="Next plugin"
                    >
                      <ChevronRight size={20} />
                    </button>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
                </div>
                {/* Install command - same width as plugin card */}
                <div className="flex items-center -mx-6 mt-4">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1">
                    <InstallCommand
                      command={`/plugin install ${currentPlugin.name}@${marketplace.name}`}
                      label="Install plugin"
                    />
                  </div>
                  <div className="w-8 flex-shrink-0" />
                </div>
              </div>
            )}

            {/* README Section - shows selected plugin's README */}
            {currentPluginReadme && (
              <section className="mt-10 border border-border rounded-xl overflow-hidden bg-card">
                <div className="px-6 py-3 border-b border-border bg-background-secondary">
                  <h2 className="text-sm font-semibold text-foreground">
                    README
                  </h2>
                </div>
                <div className="p-6 prose prose-sm dark:prose-invert max-w-none max-h-[48rem] overflow-auto scrollbar-auto-hide">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                    components={{
                      img: ({ src, alt, height, width, ...props }) => {
                        // Transform relative URLs to GitHub raw URLs
                        let imgSrc = typeof src === "string" ? src : "";
                        if (imgSrc && !imgSrc.startsWith("http") && !imgSrc.startsWith("data:")) {
                          imgSrc = `https://raw.githubusercontent.com/${marketplace.repo_full_name}/HEAD/${imgSrc.replace(/^\.?\//, "")}`;
                        }
                        // Apply height/width as inline styles to override .prose CSS
                        // This matches GitHub's behavior of respecting HTML img attributes
                        const style: React.CSSProperties = {};
                        if (height) style.height = typeof height === "number" ? `${height}px` : height;
                        if (width) style.width = typeof width === "number" ? `${width}px` : width;
                        // eslint-disable-next-line @next/next/no-img-element
                        return <img src={imgSrc} alt={alt || ""} style={style} {...props} />;
                      },
                      // Strip links from images (badges shouldn't be clickable)
                      a: ({ href, children, node }) => {
                        // Check if this link wraps only an image by examining the AST node
                        const linkChildren = node?.children || [];
                        const hasOnlyImage = linkChildren.length === 1 &&
                          "tagName" in linkChildren[0] &&
                          linkChildren[0].tagName === "img";

                        if (hasOnlyImage) {
                          // Return just the image without the link wrapper
                          return <>{children}</>;
                        }

                        // Regular links - render normally
                        return <a href={href}>{children}</a>;
                      },
                    }}
                  >
                    {currentPluginReadme}
                  </ReactMarkdown>
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar - More from Author */}
          <aside className="mt-8 lg:mt-0 space-y-6">
            {/* More from Author */}
            {hasOtherMarketplaces && (
              <section className="glass-card border border-border rounded-2xl p-4 shadow-lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  More marketplaces from <span className="font-mono text-foreground-muted">@{author.id}</span>
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
