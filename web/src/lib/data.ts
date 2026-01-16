import type {
  AuthorDetail,
  Marketplace,
  FlatPlugin,
  BrowsePlugin,
  SortOption,
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

export function getCategoryBadgeClass(category: string): string {
  // Validate category is in CATEGORY_ORDER to avoid arbitrary class names
  if (VALID_CATEGORIES.has(category as NormalizedCategory)) {
    return `badge-${category}`;
  }
  return "badge-development"; // fallback
}

// ============================================
// CATEGORY NORMALIZATION
// ============================================

// Non-obvious category aliases (case variations handled by normalizeCategory)
const CATEGORY_ALIASES: Record<string, string> = {
  // Development aliases
  "developer-tools": "development",
  "development-tools": "development",
  "development-engineering": "development",
  "development-utilities": "development",
  "development-workflow": "development",
  "development-skills": "development",
  "coding": "development",
  "programming": "development",

  // DevOps aliases
  "automation-devops": "devops",
  "deployment": "devops",
  "cicd": "devops",
  "ci-cd": "devops",

  // AI/ML aliases
  "ai": "ai-ml",
  "ai-agents": "ai-ml",
  "ai-agency": "ai-ml",
  "agents": "ai-ml",
  "machine-learning": "ai-ml",
  "personalities": "ai-ml",

  // Productivity aliases
  "productivity-organization": "productivity",

  // Automation aliases
  "workflows": "automation",
  "workflow": "automation",
  "workflow-orchestration": "automation",
  "orchestration": "automation",

  // Testing aliases
  "code-quality-testing": "testing",
  "testing-qa": "testing",
  "qa": "testing",

  // Quality aliases
  "code-quality": "quality",
  "code-review": "quality",

  // Security aliases
  "security-compliance-legal": "security",
  "security-testing": "security",

  // Database aliases
  "databases": "database",

  // Documentation aliases
  "docs": "documentation",

  // API aliases
  "api-development": "api",

  // Design aliases
  "design-ux": "design",
  "ui-design": "design",
  "ux-ui": "design",
  "ui-development": "design",

  // Business aliases
  "business-sales": "business",
  "business-tools": "business",
  "business-marketing": "business",
  "finance": "business",
  "payments": "business",
  "ecommerce": "business",

  // Marketing aliases
  "marketing-growth": "marketing",

  // Infrastructure aliases
  "operations": "infrastructure",
  "cloud": "infrastructure",
  "cloud-infrastructure": "infrastructure",
  "monitoring": "infrastructure",

  // Languages aliases
  "language": "languages",

  // Utilities aliases
  "tools": "utilities",
  "utility": "utilities",
  "tooling": "utilities",
  "skill-enhancers": "utilities",

  // Integration aliases
  "integrations": "integration",
  "mcp": "integration",
  "mcp-servers": "integration",
  "mcp-integrations": "integration",

  // Learning aliases
  "education": "learning",

  // Git aliases
  "git-workflow": "git",
  "git-operations": "git",
  "version-control": "git",

  // Frameworks aliases
  "framework": "frameworks",
};

// Ordered list of categories for display
export const CATEGORY_ORDER = [
  "development",
  "ai-ml",
  "productivity",
  "automation",
  "devops",
  "testing",
  "quality",
  "security",
  "database",
  "api",
  "infrastructure",
  "integration",
  "design",
  "documentation",
  "git",
  "frameworks",
  "languages",
  "utilities",
  "business",
  "marketing",
  "learning",
  "uncategorized",
] as const;

export type NormalizedCategory = typeof CATEGORY_ORDER[number];

// Pre-computed Set for O(1) category validation
const VALID_CATEGORIES = new Set<NormalizedCategory>(CATEGORY_ORDER);

// Display names for categories
const CATEGORY_DISPLAY_NAMES: Record<NormalizedCategory, string> = {
  development: "Development",
  "ai-ml": "AI & Machine Learning",
  productivity: "Productivity",
  automation: "Automation & Workflows",
  devops: "DevOps",
  testing: "Testing",
  quality: "Code Quality",
  security: "Security",
  database: "Database",
  api: "API",
  infrastructure: "Infrastructure",
  integration: "Integrations",
  design: "Design",
  documentation: "Documentation",
  git: "Git & Version Control",
  frameworks: "Frameworks",
  languages: "Languages",
  utilities: "Utilities",
  business: "Business",
  marketing: "Marketing",
  learning: "Learning",
  uncategorized: "Other",
};

export function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "uncategorized";

  // Normalize: lowercase, trim, replace spaces/underscores with hyphens
  const normalized = category.toLowerCase().trim().replace(/[\s_]+/g, "-");

  // Remove special characters like commas, ampersands, slashes
  const cleaned = normalized.replace(/[,&/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  // Check if it's already a valid category
  if (CATEGORY_ORDER.includes(cleaned as NormalizedCategory)) {
    return cleaned;
  }

  // Check aliases
  return CATEGORY_ALIASES[cleaned] || "uncategorized";
}

export function getCategoryDisplayName(category: string): string {
  if (CATEGORY_ORDER.includes(category as NormalizedCategory)) {
    return CATEGORY_DISPLAY_NAMES[category as NormalizedCategory];
  }
  return category;
}

export interface CategoryGroup {
  category: NormalizedCategory;
  displayName: string;
  plugins: BrowsePlugin[];
}

export function groupPluginsByCategory(plugins: BrowsePlugin[]): CategoryGroup[] {
  const groups = new Map<string, BrowsePlugin[]>();

  // Group plugins by normalized category
  for (const plugin of plugins) {
    const normalizedCat = normalizeCategory(plugin.category);
    if (!groups.has(normalizedCat)) {
      groups.set(normalizedCat, []);
    }
    const categoryPlugins = groups.get(normalizedCat);
    if (categoryPlugins) {
      categoryPlugins.push(plugin);
    }
  }

  // Sort plugins within each group by stars
  for (const [, categoryPlugins] of groups) {
    categoryPlugins.sort((a, b) => (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0));
  }

  // Convert to array and sort by CATEGORY_ORDER
  const result: CategoryGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const categoryPlugins = groups.get(category);
    if (categoryPlugins && categoryPlugins.length > 0) {
      result.push({
        category,
        displayName: getCategoryDisplayName(category),
        plugins: categoryPlugins,
      });
    }
  }

  return result;
}
