// ============================================
// AGENT MART DATA TYPES
// ============================================

export interface IndexData {
  meta: Meta;
  owners: OwnerSummary[];
}

export interface Meta {
  total_owners: number;
  total_repos: number;
  total_plugins: number;
  total_commands: number;
  total_skills: number;
  generated_at: string;
}

export interface OwnerSummary {
  id: string;
  display_name: string;
  type: "Organization" | "User";
  avatar_url: string;
  url: string;
  stats: OwnerStats;
}

export interface OwnerStats {
  total_repos: number;
  total_plugins: number;
  total_commands: number;
  total_skills: number;
  total_stars: number;
  total_forks: number;
}

// Owner detail (from public/data/owners/{id}.json)
export interface OwnerDetail {
  owner: Owner;
  repos: Repo[];
}

export interface Owner {
  id: string;
  display_name: string;
  type: "Organization" | "User";
  avatar_url: string;
  url: string;
  bio: string | null;
  stats: OwnerStats;
}

export interface Repo {
  full_name: string;
  url: string;
  description: string;
  homepage: string | null;
  signals: Signals;
  file_tree: FileTreeEntry[];
  marketplace: Marketplace;
}

export interface Marketplace {
  name: string;
  version: string;
  description: string;
  owner_info: {
    name: string;
    email: string;
  };
  keywords: string[];
  plugins: Plugin[];
}

export interface Signals {
  stars: number;
  forks: number;
  pushed_at: string;
  created_at: string;
  license: string | null;
}

export interface FileTreeEntry {
  path: string;
  type: "blob" | "tree";
  size: number | null;
}

export interface Plugin {
  name: string;
  description: string;
  source: string;
  category: PluginCategory;
  version: string | null;
  author: PluginAuthor | null;
  install_commands: string[];
  signals: Signals;
  commands: Command[];
  skills: Skill[];
}

export type PluginCategory =
  | "development"
  | "productivity"
  | "learning"
  | "automation"
  | "integration"
  | "utility"
  | string; // Allow other categories

export interface PluginAuthor {
  name: string;
  email: string;
}

export interface Command {
  name: string;
  description: string;
  path: string;
  frontmatter: CommandFrontmatter;
  content: string;
}

export interface CommandFrontmatter {
  description?: string;
  "allowed-tools"?: string;
  "argument-hint"?: string[];
  [key: string]: unknown;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  frontmatter: SkillFrontmatter;
  content: string;
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

// Flattened types for search/display
export interface FlatPlugin extends Plugin {
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string;
  repo_full_name: string;
}

export interface FlatCommand extends Command {
  owner_id: string;
  plugin_name: string;
  repo_full_name: string;
  stars: number;
}

export interface FlatSkill extends Skill {
  owner_id: string;
  plugin_name: string;
  repo_full_name: string;
  stars: number;
}

// Sort options
export type SortOption = "stars" | "forks" | "recent";

// Search result types
export type SearchResultType = "plugin" | "command" | "skill" | "repo";

export interface SearchResult {
  type: SearchResultType;
  item: FlatPlugin | FlatCommand | FlatSkill | Repo;
}
