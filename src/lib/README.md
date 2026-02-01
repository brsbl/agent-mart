# Core Libraries

[Back to main README](../../README.md)

This directory contains the core utility modules for the Agent Mart ETL pipeline.

## Modules

### `github.js` - GitHub API Client

GraphQL and REST client with batching, rate limiting, and retry logic.

**Key Functions:**
- `searchCode(query)` - Code search with 10 req/min rate limit
- `fetchReposBatch(repos)` - GraphQL batching (up to 15 repos per query)
- `fetchTree(owner, repo, sha)` - Get repository file tree
- `fetchFile(owner, repo, path, ref)` - Fetch file contents

**Rate Limiting:**
| API | Limit | Strategy |
|-----|-------|----------|
| Code Search | 10/min | Bottleneck queue |
| REST API | 5000/hr | Bottleneck queue |
| GraphQL | 5000 pts/hr | Per-query tracking |

**Batching Strategy:**

GraphQL batching reduces API calls by ~90%:

```graphql
query {
  repo1: repository(owner: "a", name: "b") { ...fields }
  repo2: repository(owner: "c", name: "d") { ...fields }
  # Up to 15 repos per query
}
```

### `cache.js` - SHA-Based Caching

Content-addressable caching based on Git commit SHAs.

**Cache Structure:**
```
.cache/
├── repos/
│   └── {owner}/{repo}/{sha}.json
├── trees/
│   └── {owner}/{repo}/{sha}.json
└── files/
    └── {owner}/{repo}/{sha}/{path}.json
```

**Cache Behavior:**
- **Cache hit:** If the repository SHA hasn't changed, skip fetching
- **Cache invalidation:** New commits produce new SHAs, automatically invalidating stale cache

**Security Measures:**
1. **Path traversal prevention** - Cache paths validated against base directory
2. **Prototype pollution prevention** - Forbidden keys (`__proto__`, `constructor`) blocked
3. **GraphQL injection prevention** - All inputs sanitized before queries

### `parser.js` - File Parsing

Parses JSON, YAML, and Markdown files from repositories.

**Key Functions:**
- `parseJSON(content)` - Parse JSON with error handling
- `parseYAML(content)` - Parse YAML frontmatter
- `parseFrontmatter(markdown)` - Extract YAML frontmatter from Markdown files

### `validator.js` - Schema Validation

Validates marketplace files against expected schemas.

**Key Functions:**
- `validateMarketplace(data)` - Validate marketplace.json structure
- `validatePlugin(data)` - Validate plugin.json structure

### `categorizer.js` - Category Normalization

Simple category normalization that preserves plugin-defined categories with basic cleanup.

**Key Functions:**
- `normalizeCategory(value)` - Normalize a single category value (lowercase, trim, hyphenate)
- `collectPluginCategories(pluginDef)` - Collect categories from all source fields in a plugin definition

**Normalization:**
- Lowercase and trim whitespace
- Convert spaces to hyphens
- Apply common variant mappings (e.g., `cicd` → `ci-cd`)

### `utils.js` - General Utilities

Logging and file I/O helper functions.

**Key Functions:**
- `log(message)` - Timestamped logging
- `loadJson(path)` - Read and parse JSON file
- `saveJson(path, data)` - Write JSON with formatting

---

## Data Schemas

### Marketplace (Internal)

```typescript
interface Marketplace {
  name: string;
  version: string | null;
  description: string | null;
  keywords: string[];
  repo_full_name: string;
  repo_url: string;
  plugins: Plugin[];
  files: Record<string, string>;
  signals: {
    stars: number;
    forks: number;
    pushed_at: string | null;
  };
  categories: string[];  // Dynamic categories from plugins
}
```

### Output: `marketplaces-browse.json`

```json
{
  "meta": {
    "total_authors": 921,
    "total_marketplaces": 979,
    "total_plugins": 3493
  },
  "marketplaces": [{
    "name": "my-marketplace",
    "description": "...",
    "author_id": "owner",
    "author_display_name": "Owner Name",
    "author_avatar_url": "https://...",
    "categories": ["testing", "automation"],
    "signals": {
      "stars": 100,
      "forks": 10,
      "pushed_at": "2026-01-15T...",
      "trending_score": 1.5,
      "stars_gained_7d": 25
    }
  }]
}
```

---

## Performance

| Metric | Value |
|--------|-------|
| API calls (full pipeline) | ~500 (with GraphQL batching) |
| Build time (full pipeline) | ~10 minutes |
