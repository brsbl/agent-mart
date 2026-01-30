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
  PluginSource,
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

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

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
// DYNAMIC CATEGORY SYSTEM
// ============================================

// Words that should be displayed in full uppercase
const UPPERCASE_WORDS = new Set([
  // Common acronyms
  'ai', 'api', 'aws', 'bdd', 'ci', 'cd', 'cli', 'cms', 'cpu', 'crm', 'css',
  'csv', 'db', 'ddd', 'dns', 'dsl', 'dx', 'e2e', 'ec2', 'ecs', 'eks', 'elk',
  'emr', 'erd', 'etl', 'ftp', 'gcp', 'gpu', 'gui', 'hcl', 'hr', 'html', 'http',
  'https', 'iac', 'id', 'ide', 'io', 'ip', 'it', 'jit', 'js', 'json', 'jwt',
  'k8s', 'kms', 'kpi', 'llm', 'lsp', 'ml', 'mcp', 'mvc', 'mvp', 'nlp', 'npm',
  'oauth', 'ocr', 'oop', 'orm', 'os', 'otp', 'pdf', 'php', 'png', 'poc', 'pr',
  'prd', 'qa', 'rag', 'rds', 'rest', 'rfc', 'rpc', 's3', 'saas', 'sdk', 'seo',
  'sns', 'soc', 'sop', 'sql', 'sqs', 'sre', 'ssh', 'ssl', 'ssr', 'svg', 'tcp',
  'tdd', 'tls', 'tui', 'udp', 'ui', 'uri', 'url', 'ux', 'vm', 'vpn', 'vps',
  'wasm', 'wcag', 'xml', 'yaml',
]);

// Words with specific capitalization (mixed case, special syntax)
const SPECIAL_CASE_WORDS: Record<string, string> = {
  // Claude Code specific
  'claude-md': 'CLAUDE.md',
  // Operating systems
  'ios': 'iOS',
  'macos': 'macOS',
  'tvos': 'tvOS',
  'watchos': 'watchOS',
  'ipados': 'iPadOS',
  'visionos': 'visionOS',
  // Databases
  'mongodb': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mariadb': 'MariaDB',
  'sqlite': 'SQLite',
  'dynamodb': 'DynamoDB',
  'couchdb': 'CouchDB',
  'timescaledb': 'TimescaleDB',
  'influxdb': 'InfluxDB',
  'neo4j': 'Neo4j',
  'nosql': 'NoSQL',
  // Languages & runtimes
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'deno': 'Deno',
  'golang': 'Go',
  'csharp': 'C#',
  'c#': 'C#',
  'cpp': 'C++',
  'c++': 'C++',
  'objc': 'Objective-C',
  'fsharp': 'F#',
  'dotnet': '.NET',
  '.net': '.NET',
  'aspnet': 'ASP.NET',
  // Frameworks & libraries
  'nextjs': 'Next.js',
  'nuxtjs': 'Nuxt.js',
  'vuejs': 'Vue.js',
  'reactjs': 'React.js',
  'angularjs': 'AngularJS',
  'expressjs': 'Express.js',
  'nestjs': 'NestJS',
  'fastapi': 'FastAPI',
  'openapi': 'OpenAPI',
  'graphql': 'GraphQL',
  'postgrest': 'PostgREST',
  'grpc': 'gRPC',
  'websocket': 'WebSocket',
  'websockets': 'WebSockets',
  'webrtc': 'WebRTC',
  'webassembly': 'WebAssembly',
  'webgl': 'WebGL',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'langchain': 'LangChain',
  'langgraph': 'LangGraph',
  'tailwindcss': 'Tailwind CSS',
  'shadcn': 'shadcn/ui',
  'swiftui': 'SwiftUI',
  'uikit': 'UIKit',
  'rxjs': 'RxJS',
  'typeorm': 'TypeORM',
  'sqlalchemy': 'SQLAlchemy',
  // Platforms & services
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'bitbucket': 'Bitbucket',
  'openai': 'OpenAI',
  'supabase': 'Supabase',
  'firebase': 'Firebase',
  'vercel': 'Vercel',
  'netlify': 'Netlify',
  'cloudflare': 'Cloudflare',
  'elasticsearch': 'Elasticsearch',
  'opensearch': 'OpenSearch',
  'chatgpt': 'ChatGPT',
  'deepmind': 'DeepMind',
  'dall-e': 'DALL-E',
  'wordpress': 'WordPress',
  'hubspot': 'HubSpot',
  'sendgrid': 'SendGrid',
  'clickup': 'ClickUp',
  // DevOps & practices
  'devops': 'DevOps',
  'devsecops': 'DevSecOps',
  'mlops': 'MLOps',
  'gitops': 'GitOps',
  'finops': 'FinOps',
  'aiops': 'AIOps',
  'dataops': 'DataOps',
  'argocd': 'ArgoCD',
  'circleci': 'CircleCI',
  // Tools
  'vscode': 'VS Code',
  'neovim': 'Neovim',
  'intellij': 'IntelliJ',
  'jetbrains': 'JetBrains',
  'xcode': 'Xcode',
  'cocoapods': 'CocoaPods',
  'webpack': 'webpack',
  'rollup': 'Rollup',
  'esbuild': 'esbuild',
  'pnpm': 'pnpm',
  // Testing
  'pytest': 'pytest',
  'vitest': 'Vitest',
  'jest': 'Jest',
  'rspec': 'RSpec',
  'junit': 'JUnit',
  'testng': 'TestNG',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  // Claude-specific
  'claude.md': 'CLAUDE.md',
  // Other
  'oauth2': 'OAuth 2.0',
  'jsonschema': 'JSON Schema',
  'i18n': 'i18n',
  'a11y': 'a11y',
  'oauth': 'OAuth',
};

/**
 * Format a category to proper display case
 * Handles acronyms (AI, API), mixed case (iOS, GraphQL), and title case
 * Splits on hyphens, underscores, and periods
 */
export function formatCategoryDisplay(category: Category): string {
  if (!category) return '';

  // Check full match first (handles special cases like "node.js", "claude.md")
  const lowerFull = category.toLowerCase();
  if (SPECIAL_CASE_WORDS[lowerFull]) {
    return SPECIAL_CASE_WORDS[lowerFull];
  }

  // Split on hyphens, underscores, and periods
  return category
    .split(/[-_.]/)
    .filter(word => word.length > 0) // Remove empty strings from consecutive separators
    .map(word => {
      const lower = word.toLowerCase();
      // Check special cases first
      if (SPECIAL_CASE_WORDS[lower]) {
        return SPECIAL_CASE_WORDS[lower];
      }
      // Then check uppercase acronyms
      if (UPPERCASE_WORDS.has(lower)) {
        return word.toUpperCase();
      }
      // Default to title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Alias for formatCategoryDisplay
export function getCategoryDisplay(category: Category): string {
  return formatCategoryDisplay(category);
}

// Alias for getCategoryDisplay
export function getCategoryDisplayName(category: Category): string {
  return formatCategoryDisplay(category);
}

// Badge color palette for hash-based assignment (18 colors)
const BADGE_COLORS = [
  'badge-purple',
  'badge-blue',
  'badge-orange',
  'badge-green',
  'badge-cyan',
  'badge-yellow',
  'badge-pink',
  'badge-indigo',
  'badge-teal',
  'badge-rose',
  'badge-red',
  'badge-gray',
  'badge-mint',
  'badge-coral',
  'badge-amber',
  'badge-sand',
  'badge-slate',
  'badge-charcoal',
];

/**
 * Get a badge class for a category using hash-based color selection
 * This ensures consistent colors for the same category across the app
 */
export function getCategoryBadgeClass(category: Category): string {
  if (!category) return 'badge-gray';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
  }
  // Double-modulo pattern for guaranteed non-negative index (handles bit-shift overflow)
  const index = ((hash % BADGE_COLORS.length) + BADGE_COLORS.length) % BADGE_COLORS.length;
  return BADGE_COLORS[index];
}

// ============================================
// MARKETPLACE SORTING
// ============================================

export function sortMarketplaces(
  marketplaces: BrowseMarketplace[],
  sortBy: MarketplaceSortOption
): BrowseMarketplace[] {
  return [...marketplaces].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.signals?.stars ?? 0) - (a.signals?.stars ?? 0);

      case "trending": {
        // Sort by trending_score (z-score), with stars_gained_7d as tiebreaker
        const aScore = a.signals?.trending_score ?? 0;
        const bScore = b.signals?.trending_score ?? 0;
        const scoreDiff = bScore - aScore;
        if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

        // Tiebreaker: raw stars gained this week
        const aGain = a.signals?.stars_gained_7d ?? 0;
        const bGain = b.signals?.stars_gained_7d ?? 0;
        return bGain - aGain;
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
export function isFileInPlugin(filePath: string, pluginSource: PluginSource): boolean {
  // Object sources (GitHub, URL) have no local files - they're external plugins
  if (typeof pluginSource !== 'string') {
    return false;
  }

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

      const component: PluginComponent = {
        type: componentType,
        name: getComponentName(filePath, componentType),
        path: filePath,
        size: null,
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
