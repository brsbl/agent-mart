// ============================================
// AGENT MART DATA TYPES
// ============================================

export interface Meta {
  total_authors: number;
  total_marketplaces: number;
  total_plugins: number;
}

// Author detail (from public/data/authors/{id}.json)
export interface AuthorDetail {
  author: Author;
  marketplaces: Marketplace[];
}

export interface Author {
  id: string;
  display_name: string;
  avatar_url: string;
}

export interface Marketplace {
  name: string;
  version: string | null;
  description: string | null;
  repo_full_name: string;
  repo_url: string;
  repo_description: string | null;
  signals: Signals;
  files: Record<string, string>; // path -> content
  plugins: Plugin[];
}

// ============================================
// CATEGORY SYSTEM (dynamic from data)
// ============================================

// Categories are now dynamic strings from marketplace data
export type Category = string;

export interface Signals {
  stars: number;
  forks: number;
  pushed_at: string | null;
  stars_gained_7d?: number;
}

// Plugin source can be a simple path string or an object for external sources
export type PluginSource = string | {
  source: 'github' | 'url';
  repo?: string;
  url?: string;
  ref?: string;
  sha?: string;
  path?: string;
};

export interface Plugin {
  name: string;
  description: string | null;
  source: PluginSource;
  categories: Category[];
  install_commands: string[];
  // Optional fields that may be present from marketplace.json
  version?: string;
  author?: { name: string; email?: string } | string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  displayName?: string;
  commands?: string | string[];
  agents?: string | string[];
  hooks?: string | object;
  mcpServers?: string | object;
  lspServers?: string | object;
  skills?: string | string[];
  strict?: boolean;
}

// Flattened plugin type for search/display
export interface FlatPlugin extends Plugin {
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string;
  repo_full_name: string;
  signals: Signals;
}

// Lightweight plugin type for browse/search
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
  keywords: string[];
}

// ============================================
// PLUGIN COMPONENTS (for component-organized view)
// ============================================

export type ComponentType = 'agent' | 'command' | 'skill' | 'hook';

export interface PluginComponent {
  type: ComponentType;
  name: string;
  path: string;
  description?: string | null;
  size: number | null;
}

export interface PluginWithComponents extends Plugin {
  components: {
    agents: PluginComponent[];
    commands: PluginComponent[];
    skills: PluginComponent[];
    hooks: PluginComponent[];
  };
}

// Sort options
export type SortOption = "stars" | "recent";
export type MarketplaceSortOption = "popular" | "trending" | "recent";

export interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

export interface BrowseMarketplace {
  name: string;
  description: string | null;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  repo_full_name: string;
  signals: {
    stars: number;
    forks: number;
    pushed_at: string | null;
    trending_score?: number;
    stars_gained_7d?: number;
    stars_velocity?: number;
  };
  categories: Category[];
  keywords: string[];
}
