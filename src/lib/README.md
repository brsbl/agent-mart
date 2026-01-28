# Core Libraries

[Back to main README](../../README.md)

This directory contains the core utility modules for the Agent Mart ETL pipeline.

## Modules

### `github.js` - GitHub API Client

GraphQL and REST client with batching, rate limiting, and retry logic.

**Key Functions:**
- `searchCode(query)` - Code search with 10 req/min rate limit
- `fetchReposBatch(repos)` - GraphQL batching (up to 100 repos per query)
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
  # Up to 100 repos per query
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

### `categorizer.js` - Rules-Based Categorization

Classifies marketplaces across two orthogonal dimensions using deterministic rules.

**Design Principles:**
1. **Rules-based, not LLM-based** - Deterministic, fast, and debuggable
2. **Two dimensions** - Tech Stack (what you use) + Capabilities (what it does)
3. **Multi-select** - Marketplaces can have multiple categories in each dimension
4. **Anti-patterns** - Reduce false positives with exclusion rules

**Key Functions:**
- `buildSearchText(marketplace)` - Build searchable text from marketplace data
- `extractTechStack(text, fileTree)` - Extract tech stack categories
- `extractCapabilities(text)` - Extract capability categories
- `extractCategories(marketplace)` - Main entry point

### `utils.js` - General Utilities

Logging and file I/O helper functions.

**Key Functions:**
- `log(message, level)` - Structured logging
- `readJSON(path)` - Read and parse JSON file
- `writeJSON(path, data)` - Write JSON with formatting

---

## Categorization System

The categorization system uses rules-based extraction to classify marketplaces across two orthogonal dimensions.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    src/lib/categorizer.js                        │
├─────────────────────────────────────────────────────────────────┤
│  TECH_STACK_RULES                                                │
│  ├── patterns: RegExp[]     (text matching)                     │
│  ├── files: string[]        (file tree detection)               │
│  └── excludeIf: string[]    (mutual exclusion)                  │
│                                                                  │
│  CAPABILITIES_RULES                                              │
│  ├── patterns: RegExp[]     (text matching)                     │
│  └── antiPatterns: RegExp[] (false positive prevention)         │
├─────────────────────────────────────────────────────────────────┤
│  buildSearchText(marketplace) → string                          │
│  extractTechStack(text, fileTree) → TechStack[]                 │
│  extractCapabilities(text) → Capability[]                       │
│  extractCategories(marketplace) → { techStack, capabilities }   │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack Rules

Tech stack detection combines text pattern matching with file tree analysis.

```javascript
{
  nextjs: {
    label: 'Next.js',
    patterns: [/\bnext\.?js\b/i, /\bapp\s*router\b/i, /\bpages\s*router\b/i],
    files: ['next.config.js', 'next.config.ts', 'next.config.mjs']
  },
  react: {
    label: 'React',
    patterns: [/\breact\b/i, /\breact\s*components?\b/i],
    files: [],
    excludeIf: ['nextjs']  // Don't show React if Next.js is present
  },
  python: {
    label: 'Python',
    patterns: [/\bdjango\b/i, /\bfastapi\b/i, /\bflask\b/i, /\bpytest\b/i],
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile']
  }
  // ... more rules in categorizer.js
}
```

**Detection Logic:**
1. Build searchable text from marketplace description, plugin descriptions, command descriptions, keywords
2. Match patterns against text (word boundaries prevent partial matches)
3. Check file tree for indicator files (e.g., `tsconfig.json` → TypeScript)
4. Apply exclusion rules (e.g., React excluded when Next.js detected)

### Capabilities Rules

Capability detection uses patterns with anti-patterns to reduce false positives.

```javascript
{
  memory: {
    label: 'Memory',
    patterns: [
      /\brag\b/i,
      /\bvector\s*(?:store|database|db|search)\b/i,
      /\bembeddings?\b/i,
      /\blong[- ]?term\s*(?:memory|context)\b/i
    ],
    antiPatterns: [
      /\bmemory\s*leak/i,      // Programming context
      /\bout\s*of\s*memory/i,  // Error context
      /\bmemory\s*usage/i      // Performance context
    ]
  },
  'browser-automation': {
    label: 'Browser Automation',
    patterns: [
      /\bplaywright\b/i,
      /\bpuppeteer\b/i,
      /\bselenium\b/i,
      /\bcypress\b/i
    ],
    antiPatterns: []
  }
}
```

**Detection Logic:**
1. Check if any anti-pattern matches → skip this category
2. Check if any pattern matches → add category

---

## Data Schemas

### Marketplace (Internal)

```typescript
interface Marketplace {
  name: string;
  version: string | null;
  description: string | null;
  owner_info: { name: string; email: string } | null;
  keywords: string[];
  repo_full_name: string;
  repo_url: string;
  homepage: string | null;
  plugins: Plugin[];
  file_tree: FileTreeEntry[];
  signals: {
    stars: number;
    forks: number;
    pushed_at: string | null;
    created_at: string | null;
    license: string | null;
  };
  categories: {
    techStack: TechStack[];
    capabilities: Capability[];
  };
}
```

### Category Types

```typescript
type TechStack =
  | 'nextjs' | 'react' | 'vue' | 'python' | 'node'
  | 'typescript' | 'go' | 'rust' | 'supabase'
  | 'aws' | 'docker' | 'postgres';

type Capability =
  | 'orchestration' | 'memory' | 'browser-automation' | 'boilerplate'
  | 'review' | 'testing' | 'devops' | 'documentation';
```

### Output: `categories.json`

```json
{
  "meta": {
    "total_authors": 900,
    "total_marketplaces": 982,
    "generated_at": "2026-01-20T06:25:33.660Z",
    "stats": {
      "totalMarketplaces": 982,
      "withTechStack": 515,
      "withCapabilities": 487,
      "techStackCounts": { ... },
      "capabilityCounts": { ... }
    }
  },
  "taxonomy": {
    "techStack": {
      "nextjs": { "label": "Next.js" },
      "python": { "label": "Python" }
    },
    "capabilities": {
      "testing": { "label": "Testing" },
      "review": { "label": "Code Review" }
    }
  }
}
```

### Output: `marketplaces-browse.json`

```json
{
  "marketplaces": [{
    "name": "my-marketplace",
    "description": "...",
    "author_id": "owner",
    "author_display_name": "Owner Name",
    "author_avatar_url": "https://...",
    "categories": {
      "techStack": ["typescript", "node"],
      "capabilities": ["testing", "review"]
    },
    "signals": {
      "stars": 100,
      "forks": 10,
      "pushed_at": "2026-01-15T..."
    }
  }]
}
```

---

## Performance

| Metric | Value |
|--------|-------|
| API calls (3 repos) | ~15 (vs ~229 without batching) |
| Build time (3 repos) | ~15 seconds |
| Cache hit rebuild | ~11 seconds |

---

## Adding New Categories

### Tech Stack

1. Add rule to `TECH_STACK_RULES` in `src/lib/categorizer.js`:
   ```javascript
   newtech: {
     label: 'New Tech',
     patterns: [/\bnewtech\b/i],
     files: ['newtech.config.js'],
     excludeIf: []  // optional
   }
   ```

2. Add type to `web/src/lib/types.ts`:
   ```typescript
   export type TechStack = ... | 'newtech';
   ```

3. Add display info to `web/src/lib/data.ts`:
   ```typescript
   export const TECH_STACK_ORDER: TechStack[] = [..., 'newtech'];
   ```

4. Run pipeline: `npm run pipeline`

### Capabilities

1. Add rule to `CAPABILITIES_RULES` in `src/lib/categorizer.js`:
   ```javascript
   'new-capability': {
     label: 'New Capability',
     patterns: [/\bnew capability\b/i],
     antiPatterns: [/\bnot this\b/i]
   }
   ```

2. Add type and display info to frontend (same as tech stack).

---

## Troubleshooting

### False Positives

If a category has too many false positives:
1. Check `data/category-stats.json` for distribution
2. Tighten patterns with word boundaries: `/\bword\b/i`
3. Add anti-patterns to exclude common false matches
4. Re-run: `node src/pipeline/08-categorize.js`

### Missing Categories

If marketplaces aren't being categorized:
1. Check if patterns match the marketplace text
2. Verify file indicators are in the expected paths
3. Check `buildSearchText()` includes the relevant fields

### Debugging

Run categorization with verbose output:
```bash
node --input-type=module -e "
  import { extractCategories, buildSearchText } from './src/lib/categorizer.js';
  import { readFileSync } from 'fs';
  const data = JSON.parse(readFileSync('data/06-enriched.json'));
  const marketplace = data.authors['some-author'].marketplaces[0];
  console.log('Text:', buildSearchText(marketplace));
  console.log('Categories:', extractCategories(marketplace));
"
```
