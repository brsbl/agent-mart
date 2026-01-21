import type {
  AuthorDetail,
  Marketplace,
  FlatPlugin,
  BrowsePlugin,
  BrowseMarketplace,
  SortOption,
  MarketplaceSortOption,
  Category,
} from "./types";

// ============================================
// DATA FLATTENING (for search/display)
// ============================================

export function flattenPlugins(authorDetail: AuthorDetail): FlatPlugin[] {
  const plugins: FlatPlugin[] = [];

  for (const marketplace of authorDetail.marketplaces) {
    const marketplacePlugins = marketplace.plugins || [];
    for (const plugin of marketplacePlugins) {
      plugins.push({
        ...plugin,
        author_id: authorDetail.author.id,
        author_display_name: authorDetail.author.display_name,
        author_avatar_url: authorDetail.author.avatar_url,
        repo_full_name: marketplace.repo_full_name,
      });
    }
  }

  return plugins;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function isSinglePluginMarketplace(marketplace: Marketplace): boolean {
  return marketplace.plugins.length === 1;
}

// ============================================
// SORTING
// ============================================

export function sortPlugins(
  plugins: BrowsePlugin[],
  sortBy: SortOption
): BrowsePlugin[] {
  return [...plugins].sort((a, b) => {
    switch (sortBy) {
      case "stars":
        return (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0);
      case "recent":
        return (
          new Date(b.signals?.pushed_at ?? 0).getTime() -
          new Date(a.signals?.pushed_at ?? 0).getTime()
        );
      default:
        return 0;
    }
  });
}

// ============================================
// UTILITIES
// ============================================

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return "Unknown date";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(diffDays / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// UNIFIED CATEGORY SYSTEM (12 categories)
// ============================================

// Category order for display
export const CATEGORY_ORDER = [
  'templates',
  'knowledge-base',
  'devops',
  'code-quality',
  'code-review',
  'testing',
  'data-analytics',
  'design',
  'documentation',
  'planning',
  'security',
  'orchestration',
] as const satisfies readonly Category[];

// Category display names
const CATEGORY_DISPLAY: Record<Category, string> = {
  'knowledge-base': 'Agent Memory',
  'templates': 'Templates',
  'devops': 'DevOps',
  'code-quality': 'Code Quality',
  'code-review': 'Code Review',
  'testing': 'Testing',
  'data-analytics': 'Data & Analytics',
  'design': 'Design',
  'documentation': 'Documentation',
  'planning': 'Planning',
  'security': 'Security',
  'orchestration': 'Orchestration',
};

export function getCategoryDisplay(category: Category): string {
  return CATEGORY_DISPLAY[category] ?? category;
}

// ============================================
// MARKETPLACE SORTING
// ============================================

export function sortMarketplaces(
  marketplaces: BrowseMarketplace[],
  sortBy: MarketplaceSortOption
): BrowseMarketplace[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return [...marketplaces].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0);

      case "trending": {
        // Trending: pushed within last 7 days, sorted by stars
        const aTime = new Date(a.signals?.pushed_at ?? 0).getTime();
        const bTime = new Date(b.signals?.pushed_at ?? 0).getTime();
        const aRecent = aTime > sevenDaysAgo;
        const bRecent = bTime > sevenDaysAgo;

        // Recent items first
        if (aRecent !== bRecent) return bRecent ? 1 : -1;

        // Within same recency tier, sort by stars
        return (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0);
      }

      case "recent":
        return (
          new Date(b.signals?.pushed_at ?? 0).getTime() -
          new Date(a.signals?.pushed_at ?? 0).getTime()
        );

      default: {
        // Exhaustiveness check - will cause compile error if new sort option is added
        const _exhaustiveCheck: never = sortBy;
        return 0;
      }
    }
  });
}
