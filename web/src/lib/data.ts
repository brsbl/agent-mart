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
  if (!res.ok) throw new Error("Failed to fetch index data");
  return res.json();
}

export async function getOwnerDetail(ownerId: string): Promise<OwnerDetail> {
  const res = await fetch(`/data/owners/${ownerId}.json`);
  if (!res.ok) throw new Error(`Failed to fetch owner: ${ownerId}`);
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
          stars: plugin.signals.stars,
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
          stars: plugin.signals.stars,
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
    default:
      return "badge-development"; // fallback
  }
}

// Get unique categories from plugins
export function getUniqueCategories(plugins: FlatPlugin[]): string[] {
  const categories = new Set(plugins.map((p) => p.category));
  return Array.from(categories).sort();
}
