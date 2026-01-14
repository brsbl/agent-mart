// ============================================
// AGENT MART DATA TYPES
// ============================================

export interface Meta {
  total_owners: number;
  total_repos: number;
  total_plugins: number;
  total_commands: number;
  total_skills: number;
  generated_at: string;
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
  bio?: string | null;
  stats: OwnerStats;
}

export interface Repo {
  full_name: string;
  url: string;
  description: string;
  homepage: string | null;
  signals: Signals;
  file_tree: FileTreeEntry[];
  marketplace?: Marketplace;
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
  description: string | null;
  source: string;
  category: PluginCategory | null;
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
  | "ai-ml"
  | "devops"
  | "testing"
  | "quality"
  | "security"
  | "database"
  | "api"
  | "infrastructure"
  | "design"
  | "documentation"
  | "git"
  | "frameworks"
  | "languages"
  | "utilities"
  | "business"
  | "marketing"
  | "uncategorized";

export interface PluginAuthor {
  name: string;
  email?: string;
}

export interface Command {
  name: string;
  description: string;
  path: string;
  frontmatter: CommandFrontmatter | null;
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
  frontmatter: SkillFrontmatter | null;
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

// Lightweight plugin type for browse/search (excludes full commands/skills content)
export interface BrowsePlugin {
  name: string;
  description: string | null;
  category: PluginCategory | null;
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string;
  repo_full_name: string;
  install_commands: string[];
  signals: {
    stars: number;
    pushed_at: string;
  };
  commands_count: number;
}

// Sort options
export type SortOption = "stars" | "recent";
