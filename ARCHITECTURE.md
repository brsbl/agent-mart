# Architecture

This document describes the technical architecture of Agent Mart, including the ETL pipeline, categorization system, data schemas, and frontend application.

## Overview

Agent Mart is a static-site generator that crawls GitHub for Claude Code marketplace definitions, processes them through an 8-step ETL pipeline, and outputs JSON files consumed by a Next.js frontend.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GitHub API                                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ETL Pipeline                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 01       │  │ 02       │  │ 03       │  │ 04       │  │ 05       │  │
│  │ Discover │─▶│ Fetch    │─▶│ Fetch    │─▶│ Fetch    │─▶│ Parse    │  │
│  │          │  │ Repos    │  │ Trees    │  │ Files    │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │          │
│  │ 07       │◀─│ 08       │◀─│ 06       │◀───────────────────┘          │
│  │ Output   │  │ Categorize│  │ Enrich   │                              │
│  └──────────┘  └──────────┘  └──────────┘                              │
│                                                                         │
│  Note: Steps execute in order 06 → 08 → 07 (numbering is historical)   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Static JSON Output                                  │
│  web/public/data/: index.json, authors/*.json, categories.json,         │
│                    marketplaces-browse.json, plugins-browse.json        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                                    │
│  web/src/app/                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### Stage 01: Discover (`src/pipeline/01-discover.js`)

Searches GitHub for repositories containing `marketplace.json` files using the code search API.

**Input:** None
**Output:** `data/01-discovered.json`

```json
{
  "repos": [
    { "full_name": "owner/repo", "path": "marketplace.json" }
  ]
}
```

### Stage 02: Fetch Repos (`src/pipeline/02-fetch-repos.js`)

Fetches repository and owner metadata using GraphQL batching.

**Input:** `data/01-discovered.json`
**Output:** `data/02-repos.json`

```json
{
  "repos": [{
    "full_name": "owner/repo",
    "default_branch": "main",
    "description": "...",
    "stars": 100,
    "forks": 10,
    "owner": {
      "login": "owner",
      "type": "User",
      "avatar_url": "https://..."
    }
  }]
}
```

### Stage 03: Fetch Trees (`src/pipeline/03-fetch-trees.js`)

Downloads file tree structures for each repository.

**Input:** `data/02-repos.json`
**Output:** `data/03-trees.json`

### Stage 04: Fetch Files (`src/pipeline/04-fetch-files.js`)

Fetches specific files (marketplace.json, SKILL.md, README.md, etc.).

**Input:** `data/03-trees.json`
**Output:** `data/04-files.json`

### Stage 05: Parse (`src/pipeline/05-parse.js`)

Parses and validates marketplace definitions, plugins, skills, and commands.

**Input:** `data/04-files.json`
**Output:** `data/05-parsed.json`

### Stage 06: Enrich (`src/pipeline/06-enrich.js`)

Builds the owner-centric data model, aggregating marketplaces under authors.

**Input:** `data/05-parsed.json`
**Output:** `data/06-enriched.json`

```json
{
  "authors": {
    "owner-id": {
      "id": "owner-id",
      "display_name": "Owner Name",
      "avatar_url": "https://...",
      "marketplaces": [...]
    }
  }
}
```

### Stage 08: Categorize (`src/pipeline/08-categorize.js`)

Applies rules-based categorization to extract tech stack and capabilities.

**Input:** `data/06-enriched.json`
**Output:**
- `data/marketplaces-categorized.json` - Marketplaces with categories
- `data/category-stats.json` - Category distribution statistics
- `data/category-taxonomy.json` - Category labels for frontend

### Stage 07: Output (`src/pipeline/07-output.js`)

Generates final static JSON files for the frontend.

**Input:** `data/06-enriched.json`, `data/marketplaces-categorized.json`
**Output:**
- `web/public/data/index.json` - Homepage data with author list
- `web/public/data/authors/*.json` - Per-author detail pages
- `web/public/data/categories.json` - Category taxonomy and stats
- `web/public/data/marketplaces-browse.json` - Browse page marketplace data
- `web/public/data/plugins-browse.json` - Browse page plugin data

---

## Categorization System

The categorization system uses rules-based extraction to classify marketplaces across two orthogonal dimensions.

### Design Principles

1. **Rules-based, not LLM-based** - Deterministic, fast, and debuggable
2. **Two dimensions** - Tech Stack (what you use) + Capabilities (what it does)
3. **Multi-select** - Marketplaces can have multiple categories in each dimension
4. **Anti-patterns** - Reduce false positives with exclusion rules

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
  // ... more rules
}
```

**Detection logic:**
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
    // Only tool names - removed broad patterns that caused false positives
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

**Detection logic:**
1. Check if any anti-pattern matches → skip this category
2. Check if any pattern matches → add category

### Category Statistics

The categorization stage outputs statistics for monitoring:

```json
{
  "totalMarketplaces": 982,
  "withTechStack": 515,
  "withCapabilities": 487,
  "withAnyCategory": 698,
  "techStackCounts": {
    "node": 210,
    "python": 198,
    "typescript": 194
  },
  "capabilityCounts": {
    "testing": 237,
    "review": 192,
    "documentation": 182
  }
}
```

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

## Frontend Architecture

The frontend is a Next.js 14+ application using the App Router.

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Homepage with category filters |
| `/[author]` | `app/[author]/page.tsx` | Author detail page |
| `/[author]/[marketplace]` | `app/[author]/[marketplace]/page.tsx` | Marketplace detail |

### Data Flow

```
┌──────────────────────┐
│ web/public/data/     │
│  ├── index.json      │
│  ├── categories.json │
│  ├── marketplaces-   │
│  │   browse.json     │
│  ├── plugins-        │
│  │   browse.json     │
│  └── authors/*.json  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ web/src/lib/data.ts  │
│  loadMarketplaces()  │
│  loadCategories()    │
│  loadAuthorData()    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Server Components    │
│  ├── page.tsx        │
│  ├── [author]/       │
│  └── [marketplace]/  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Client Components    │
│  ├── MarketplaceCard │
│  └── CategoryPill    │
└──────────────────────┘
```

Note: Filters are implemented inline in `page.tsx`, not as a separate component.

### Filter System

The homepage implements two-dimensional filtering:

```typescript
// State
const [selectedTechStack, setSelectedTechStack] = useState<Set<TechStack>>(new Set());
const [selectedCapabilities, setSelectedCapabilities] = useState<Set<Capability>>(new Set());

// Filter logic (AND within each dimension)
const filtered = marketplaces.filter(m => {
  // Must have ALL selected tech stack
  for (const tech of selectedTechStack) {
    if (!m.categories?.techStack?.includes(tech)) return false;
  }
  // Must have ALL selected capabilities
  for (const cap of selectedCapabilities) {
    if (!m.categories?.capabilities?.includes(cap)) return false;
  }
  return true;
});
```

---

## Caching Strategy

### SHA-Based Cache

The pipeline uses content-addressable caching based on Git commit SHAs:

```
.cache/
├── repos/
│   └── {owner}/{repo}/{sha}.json
├── trees/
│   └── {owner}/{repo}/{sha}.json
└── files/
    └── {owner}/{repo}/{sha}/{path}.json
```

**Cache hit:** If the repository SHA hasn't changed, skip fetching.
**Cache invalidation:** New commits produce new SHAs, automatically invalidating stale cache.

### Security Measures

1. **Path traversal prevention** - Cache paths validated against base directory
2. **Prototype pollution prevention** - Forbidden keys (`__proto__`, `constructor`) blocked
3. **GraphQL injection prevention** - All inputs sanitized before queries

---

## GitHub API Usage

### Rate Limiting

- REST API: 5,000 requests/hour (authenticated)
- GraphQL API: 5,000 points/hour
- Code Search: 10 requests/minute

### Batching Strategy

GraphQL batching reduces API calls by ~90%:

```graphql
query {
  repo1: repository(owner: "a", name: "b") { ...fields }
  repo2: repository(owner: "c", name: "d") { ...fields }
  # Up to 100 repos per query
}
```

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

4. Run pipeline: `npm run build`

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
