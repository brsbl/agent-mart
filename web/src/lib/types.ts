// ============================================
// AGENT MART DATA TYPES
// ============================================

export interface Meta {
  total_authors: number;
  total_marketplaces: number;
  total_plugins: number;
  total_commands: number;
  total_skills: number;
  generated_at: string;
}

export interface AuthorStats {
  total_marketplaces: number;
  total_plugins: number;
  total_commands: number;
  total_skills: number;
  total_stars: number;
  total_forks: number;
}

// Author detail (from public/data/authors/{id}.json)
export interface AuthorDetail {
  author: Author;
  marketplaces: Marketplace[];
}

export interface Author {
  id: string;
  display_name: string;
  type: "Organization" | "User";
  avatar_url: string;
  url: string;
  bio?: string | null;
  stats: AuthorStats;
}

export interface Marketplace {
  name: string;
  version: string | null;
  description: string | null;
  owner_info: { name: string; email: string } | null;
  keywords: string[];
  categories: Category[];
  repo_full_name: string;
  repo_url: string;
  homepage: string | null;
  signals: Signals;
  file_tree: FileTreeEntry[];
  plugins: Plugin[];
}

// ============================================
// UNIFIED CATEGORY SYSTEM (12 categories)
// ============================================

export type Category =
  | 'knowledge-base'
  | 'templates'
  | 'devops'
  | 'code-quality'
  | 'code-review'
  | 'testing'
  | 'data-analytics'
  | 'design'
  | 'documentation'
  | 'planning'
  | 'security'
  | 'orchestration';

export interface Signals {
  stars: number;
  forks: number;
  pushed_at: string | null;
  created_at: string | null;
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
  categories: Category[];
  version: string | null;
  author: PluginAuthor | null;
  install_commands: string[];
  signals: Signals;
  commands: Command[];
  skills: Skill[];
}

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
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  repo_full_name: string;
}

// Lightweight plugin type for browse/search (excludes full commands/skills content)
export interface BrowsePlugin {
  name: string;
  description: string | null;
  categories: Category[];
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  marketplace_name: string;
  repo_full_name: string;
  install_commands: string[];
  signals: {
    stars: number;
    pushed_at: string | null;
  };
  commands_count: number;
  skills_count: number;
  keywords: string[];
}

// Sort options
export type SortOption = "stars" | "recent";
export type MarketplaceSortOption = "popular" | "trending" | "recent";

export interface BrowseMarketplace {
  name: string;
  description: string | null;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  repo_full_name: string;
  signals: { stars: number; forks: number; pushed_at: string | null };
  plugins_count: number;
  first_plugin_name: string | null;
  keywords: string[];
  categories: Category[];
}
