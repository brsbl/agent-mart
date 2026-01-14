import type {
  IndexData,
  OwnerDetail,
  FlatPlugin,
  FlatCommand,
  FlatSkill,
  SortOption,
  PluginCategory,
} from "./types";

// ============================================
// DATA FETCHING
// ============================================

export async function getIndexData(): Promise<IndexData> {
  const res = await fetch("/data/index.json");
  if (!res.ok)
    throw new Error(`Failed to fetch index data (HTTP ${res.status})`);
  return res.json();
}

const VALID_OWNER_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export async function getOwnerDetail(ownerId: string): Promise<OwnerDetail> {
  // Validate ownerId to prevent path traversal
  if (!VALID_OWNER_ID_PATTERN.test(ownerId)) {
    throw new Error(`Invalid owner ID: ${ownerId}`);
  }

  const res = await fetch(`/data/owners/${ownerId}.json`);
  if (!res.ok)
    throw new Error(`Failed to fetch owner: ${ownerId} (HTTP ${res.status})`);
  return res.json();
}

// ============================================
// DATA FLATTENING (for search/display)
// ============================================

export function flattenPlugins(ownerDetail: OwnerDetail): FlatPlugin[] {
  const plugins: FlatPlugin[] = [];

  for (const repo of ownerDetail.repos) {
    const repoPlugins = repo.marketplace?.plugins || [];
    for (const plugin of repoPlugins) {
      plugins.push({
        ...plugin,
        owner_id: ownerDetail.owner.id,
        owner_display_name: ownerDetail.owner.display_name,
        owner_avatar_url: ownerDetail.owner.avatar_url,
        repo_full_name: repo.full_name,
      });
    }
  }

  return plugins;
}

export function flattenCommands(ownerDetail: OwnerDetail): FlatCommand[] {
  const commands: FlatCommand[] = [];

  for (const repo of ownerDetail.repos) {
    const repoPlugins = repo.marketplace?.plugins || [];
    for (const plugin of repoPlugins) {
      for (const command of plugin.commands || []) {
        commands.push({
          ...command,
          owner_id: ownerDetail.owner.id,
          plugin_name: plugin.name,
          repo_full_name: repo.full_name,
          stars: plugin.signals?.stars ?? 0,
        });
      }
    }
  }

  return commands;
}

export function flattenSkills(ownerDetail: OwnerDetail): FlatSkill[] {
  const skills: FlatSkill[] = [];

  for (const repo of ownerDetail.repos) {
    const repoPlugins = repo.marketplace?.plugins || [];
    for (const plugin of repoPlugins) {
      for (const skill of plugin.skills || []) {
        skills.push({
          ...skill,
          owner_id: ownerDetail.owner.id,
          plugin_name: plugin.name,
          repo_full_name: repo.full_name,
          stars: plugin.signals?.stars ?? 0,
        });
      }
    }
  }

  return skills;
}

// ============================================
// SORTING
// ============================================

export function sortPlugins(
  plugins: FlatPlugin[],
  sortBy: SortOption
): FlatPlugin[] {
  return [...plugins].sort((a, b) => {
    switch (sortBy) {
      case "stars":
        return b.signals.stars - a.signals.stars;
      case "forks":
        return b.signals.forks - a.signals.forks;
      case "recent":
        return (
          new Date(b.signals.pushed_at).getTime() -
          new Date(a.signals.pushed_at).getTime()
        );
      default:
        return 0;
    }
  });
}

// ============================================
// FILTERING
// ============================================

export function filterByCategory(
  plugins: FlatPlugin[],
  category: PluginCategory | "all"
): FlatPlugin[] {
  if (category === "all") return plugins;
  return plugins.filter((p) => p.category === category);
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
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case "development":
      return "badge-development";
    case "productivity":
      return "badge-productivity";
    case "learning":
      return "badge-learning";
    case "ai-ml":
      return "badge-ai-ml";
    case "devops":
      return "badge-devops";
    case "security":
      return "badge-security";
    case "testing":
      return "badge-testing";
    case "quality":
      return "badge-quality";
    case "database":
      return "badge-database";
    case "automation":
      return "badge-automation";
    case "infrastructure":
      return "badge-infrastructure";
    case "integration":
      return "badge-integration";
    case "uncategorized":
      return "badge-uncategorized";
    default:
      return "badge-development"; // fallback
  }
}

// Get unique categories from plugins
export function getUniqueCategories(plugins: FlatPlugin[]): PluginCategory[] {
  const categories = new Set(
    plugins.map((p) => p.category).filter((c): c is PluginCategory => c != null)
  );
  return Array.from(categories).sort();
}

// ============================================
// CATEGORY NORMALIZATION
// ============================================

// Map raw categories to consolidated categories
const CATEGORY_MAP: Record<string, string> = {
  // Development family
  development: "development",
  Development: "development",
  "developer-tools": "development",
  "Developer Tools": "development",
  "Development Tools": "development",
  "development-tools": "development",
  "Development Engineering": "development",
  "development-utilities": "development",
  "development-workflow": "development",
  "Development Skills": "development",
  coding: "development",
  programming: "development",

  // DevOps family
  devops: "devops",
  DevOps: "devops",
  "Automation DevOps": "devops",
  deployment: "devops",
  cicd: "devops",
  "ci-cd": "devops",

  // AI/ML family
  "ai-ml": "ai-ml",
  "AI/ML": "ai-ml",
  ai: "ai-ml",
  "ai-agents": "ai-ml",
  "ai-agency": "ai-ml",
  agents: "ai-ml",
  "machine-learning": "ai-ml",
  personalities: "ai-ml",

  // Productivity family
  productivity: "productivity",
  Productivity: "productivity",
  "productivity-organization": "productivity",

  // Automation family
  automation: "automation",
  Automation: "automation",
  workflows: "automation",
  workflow: "automation",
  "Workflow Orchestration": "automation",
  orchestration: "automation",

  // Testing family
  testing: "testing",
  Testing: "testing",
  "Code Quality Testing": "testing",
  "testing-qa": "testing",
  qa: "testing",

  // Quality family
  quality: "quality",
  "code-quality": "quality",
  "Code Quality": "quality",
  "code-review": "quality",

  // Security family
  security: "security",
  Security: "security",
  "Security, Compliance, & Legal": "security",
  "security-testing": "security",

  // Database family
  database: "database",
  Database: "database",
  Databases: "database",

  // Documentation family
  documentation: "documentation",
  Documentation: "documentation",
  docs: "documentation",

  // API family
  api: "api",
  API: "api",
  "api-development": "api",

  // Design family
  design: "design",
  Design: "design",
  "Design UX": "design",
  "UI/Design": "design",
  "UX/UI": "design",
  "ui-development": "design",

  // Business family
  business: "business",
  Business: "business",
  "Business Sales": "business",
  "business-tools": "business",
  "business-marketing": "business",
  finance: "business",
  payments: "business",
  ecommerce: "business",

  // Marketing family
  marketing: "marketing",
  "Marketing Growth": "marketing",

  // Infrastructure family
  infrastructure: "infrastructure",
  operations: "infrastructure",
  cloud: "infrastructure",
  Cloud: "infrastructure",
  "cloud-infrastructure": "infrastructure",
  monitoring: "infrastructure",

  // Languages family
  languages: "languages",
  Languages: "languages",
  language: "languages",

  // Utilities family
  utilities: "utilities",
  tools: "utilities",
  utility: "utilities",
  tooling: "utilities",
  "skill-enhancers": "utilities",

  // Integration family
  integration: "integration",
  integrations: "integration",
  mcp: "integration",
  "mcp-servers": "integration",
  "MCP Integrations": "integration",

  // Learning family
  learning: "learning",
  Learning: "learning",
  education: "learning",

  // Git family
  git: "git",
  "Git Workflow": "git",
  "git-operations": "git",
  "version-control": "git",

  // Frameworks family
  frameworks: "frameworks",
  Frameworks: "frameworks",
  framework: "frameworks",
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

// Display names for categories
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
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
  return CATEGORY_MAP[category] || "uncategorized";
}

export function getCategoryDisplayName(category: string): string {
  return CATEGORY_DISPLAY_NAMES[category] || category;
}

export interface CategoryGroup {
  category: NormalizedCategory;
  displayName: string;
  plugins: FlatPlugin[];
}

export function groupPluginsByCategory(plugins: FlatPlugin[]): CategoryGroup[] {
  const groups = new Map<string, FlatPlugin[]>();

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
    categoryPlugins.sort((a, b) => b.signals.stars - a.signals.stars);
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
