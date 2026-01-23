import type {
  AuthorDetail,
  Marketplace,
  FlatPlugin,
  BrowsePlugin,
  BrowseMarketplace,
  SortOption,
  MarketplaceSortOption,
  Category,
  ComponentType,
  PluginComponent,
  PluginWithComponents,
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
        owner_id: authorDetail.author.id,
        owner_display_name: authorDetail.author.display_name,
        owner_avatar_url: authorDetail.author.avatar_url,
        repo_full_name: marketplace.repo_full_name,
        signals: marketplace.signals,
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

// Alias for getCategoryDisplay
export function getCategoryDisplayName(category: Category): string {
  return getCategoryDisplay(category);
}

// Normalize a category string (handles unknown categories)
export function normalizeCategory(category: string | null | undefined): Category {
  if (!category) return 'orchestration';
  const normalized = category.toLowerCase().trim();
  if (CATEGORY_ORDER.includes(normalized as Category)) {
    return normalized as Category;
  }
  return 'orchestration';
}

// Category badge styling
const CATEGORY_BADGE_CLASSES: Record<Category, string> = {
  'knowledge-base': 'badge-purple',
  'templates': 'badge-blue',
  'devops': 'badge-orange',
  'code-quality': 'badge-green',
  'code-review': 'badge-cyan',
  'testing': 'badge-yellow',
  'data-analytics': 'badge-pink',
  'design': 'badge-indigo',
  'documentation': 'badge-teal',
  'planning': 'badge-rose',
  'security': 'badge-red',
  'orchestration': 'badge-gray',
};

export function getCategoryBadgeClass(category: Category): string {
  return CATEGORY_BADGE_CLASSES[category] ?? 'badge-gray';
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

// ============================================
// PLUGIN COMPONENT UTILITIES
// ============================================

/**
 * Categorize a file path by its component type
 */
export function getComponentType(path: string): ComponentType | null {
  if (path.includes('/agents/') && path.endsWith('.md')) return 'agent';
  if (path.includes('/commands/') && path.endsWith('.md')) return 'command';
  if (path.includes('/skills/') && path.endsWith('.md')) return 'skill';
  if (path.endsWith('/SKILL.md') || path === 'SKILL.md') return 'skill';
  if (path.includes('/hooks/')) return 'hook';
  return null;
}

/**
 * Extract display name from file path
 */
export function getComponentName(path: string, type: ComponentType): string {
  const filename = path.split('/').pop() || path;

  switch (type) {
    case 'agent':
    case 'command':
    case 'skill':
      // Remove .md extension
      return filename.replace(/\.md$/i, '');
    case 'hook':
      // Keep full filename for hooks (may include extension like .ts, .js)
      return filename;
    default:
      return filename;
  }
}

/**
 * Check if a file belongs to a plugin based on its source path
 * Handles root source ("./") and .claude-plugin/ prefix correctly
 */
export function isFileInPlugin(filePath: string, pluginSource: string): boolean {
  // Normalize plugin source - remove leading ./ and trailing /
  const normalizedSource = pluginSource.replace(/^\.\//, '').replace(/\/$/, '');

  // Root source means all files belong to this plugin
  if (normalizedSource === '.' || normalizedSource === '') {
    return true;
  }

  // Check both direct path and .claude-plugin/ prefixed path
  // Some repos have plugin files at root (stripe), others inside .claude-plugin/ (vercel)
  return (
    filePath.startsWith(normalizedSource + '/') ||
    filePath === normalizedSource ||
    filePath.startsWith('.claude-plugin/' + normalizedSource + '/') ||
    filePath === '.claude-plugin/' + normalizedSource
  );
}

/**
 * Organize marketplace files by plugin and component type
 */
export function organizePluginComponents(marketplace: Marketplace): PluginWithComponents[] {
  const result: PluginWithComponents[] = [];

  for (const plugin of marketplace.plugins) {
    const components: PluginWithComponents['components'] = {
      agents: [],
      commands: [],
      skills: [],
      hooks: [],
    };

    // Get all file paths that belong to this plugin
    const filePaths = Object.keys(marketplace.files || {});

    for (const filePath of filePaths) {
      // Skip config files (marketplace.json, plugin.json, README)
      if (filePath.endsWith('/marketplace.json') || filePath.endsWith('/plugin.json')) continue;
      if (filePath === '.claude-plugin/marketplace.json') continue;

      // Check if file belongs to this plugin
      if (!isFileInPlugin(filePath, plugin.source)) continue;

      // Determine component type
      const componentType = getComponentType(filePath);
      if (!componentType) continue;

      // Find file size from file_tree
      const treeEntry = marketplace.file_tree.find(e => e.path === filePath);

      const component: PluginComponent = {
        type: componentType,
        name: getComponentName(filePath, componentType),
        path: filePath,
        size: treeEntry?.size ?? null,
      };

      // Add to appropriate array
      switch (componentType) {
        case 'agent':
          components.agents.push(component);
          break;
        case 'command':
          components.commands.push(component);
          break;
        case 'skill':
          components.skills.push(component);
          break;
        case 'hook':
          components.hooks.push(component);
          break;
      }
    }

    // Sort each component array by name
    components.agents.sort((a, b) => a.name.localeCompare(b.name));
    components.commands.sort((a, b) => a.name.localeCompare(b.name));
    components.skills.sort((a, b) => a.name.localeCompare(b.name));
    components.hooks.sort((a, b) => a.name.localeCompare(b.name));

    result.push({
      ...plugin,
      components,
    });
  }

  return result;
}
