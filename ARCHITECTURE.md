# Architecture

This document describes the architecture of Agent Mart, a pipeline for building a directory of Claude Code plugins.

## Overview

Agent Mart is a 7-step ETL (Extract, Transform, Load) pipeline that:
1. Discovers Claude Code marketplaces on GitHub
2. Fetches repository and owner metadata
3. Downloads and parses plugin definitions
4. Generates static JSON for a public directory

```
GitHub API
    │
    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 01-discover │ ──► │ 02-fetch-    │ ──► │ 03-fetch-   │
│             │     │    repos     │     │    trees    │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
    ┌──────────────────────────────────────────┘
    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 04-fetch-   │ ──► │ 05-parse     │ ──► │ 06-enrich   │
│    files    │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
    ┌──────────────────────────────────────────┘
    ▼
┌─────────────┐
│ 07-output   │ ──► public/index.json
│             │     public/users/*.json
└─────────────┘
```

## Directory Structure

```
agent-mart/
├── scripts/
│   └── build.js           # Pipeline orchestrator
├── src/
│   ├── lib/
│   │   ├── github.js      # GitHub API client (GraphQL + REST)
│   │   ├── cache.js       # File-based caching
│   │   ├── parser.js      # JSON/YAML/Markdown parsing
│   │   ├── validator.js   # Schema validation
│   │   └── utils.js       # General utilities
│   └── pipeline/
│       ├── 01-discover.js
│       ├── 02-fetch-repos.js
│       ├── 03-fetch-trees.js
│       ├── 04-fetch-files.js
│       ├── 05-parse.js
│       ├── 06-enrich.js
│       └── 07-output.js
├── tests/
│   ├── smoke.test.js      # Validator and parser tests
│   └── pipeline.test.js   # Security and pattern tests
├── data/                  # Intermediate files (gitignored)
│   ├── .cache/            # SHA-based cache
│   ├── 01-discovered.json
│   ├── 02-repos.json
│   └── ...
└── public/                # Final output (gitignored)
    ├── index.json
    └── users/
        └── *.json
```

## Pipeline Steps

### Step 1: Discover

**File:** `src/pipeline/01-discover.js`

Uses GitHub code search to find repositories containing marketplace definitions:

```javascript
// Search query
path:.claude-plugin filename:marketplace.json
```

**Rate Limiting:** 10 requests per minute (GitHub's strictest limit)

**Output:** List of `{owner, repo, full_name, marketplace_path}`

### Step 2: Fetch Repos

**File:** `src/pipeline/02-fetch-repos.js`

Fetches repository and owner metadata using GraphQL batching:

```graphql
query batchRepos {
  repo0: repository(owner: "vercel", name: "next.js") {
    name, description, stargazerCount, forkCount, pushedAt
    owner { login, avatarUrl, ... }
    defaultBranchRef { name, target { oid } }
  }
  repo1: repository(...) { ... }
  # Up to 15 repos per query
}
```

**Optimization:** 90% fewer API calls vs individual REST requests

### Step 3: Fetch Trees

**File:** `src/pipeline/03-fetch-trees.js`

Downloads full file structure for each repository:

```javascript
// Uses REST API (GraphQL doesn't support recursive trees)
octokit.rest.git.getTree({ owner, repo, tree_sha, recursive: true })
```

**Caching:** By commit SHA (immutable, never expires)

### Step 4: Fetch Files

**File:** `src/pipeline/04-fetch-files.js`

Downloads specific files matching patterns:

```javascript
const FILE_PATTERNS = [
  /^\.claude-plugin\/marketplace\.json$/,
  /(^|\/)?\.claude-plugin\/plugin\.json$/,
  /(^|\/)commands\/[^/]+\.md$/,
  /(^|\/)skills\/[^/]+\/SKILL\.md$/
];
```

**Optimization:** GraphQL batching (20 files per query)

### Step 5: Parse

**File:** `src/pipeline/05-parse.js`

Parses and validates all fetched files:

| File Type | Parser | Validation |
|-----------|--------|------------|
| marketplace.json | JSON | Requires `name` and `plugins` array |
| plugin.json | JSON | Requires `name` |
| SKILL.md | YAML frontmatter | Requires `name` and `description` |
| commands/*.md | YAML frontmatter | Optional (per Claude Code spec) |

### Step 6: Enrich

**File:** `src/pipeline/06-enrich.js`

Builds user-centric data model:

```javascript
{
  user: {
    id: "vercel",
    display_name: "Vercel",
    stats: { total_stars, total_plugins, ... }
  },
  repos: [{
    full_name: "vercel/next.js",
    marketplace: {
      plugins: [{
        name: "cache-handler",
        install_commands: [...],
        commands: [...],
        skills: [...]
      }]
    }
  }]
}
```

### Step 7: Output

**File:** `src/pipeline/07-output.js`

Generates public JSON files:
- `public/index.json` - Directory homepage with all users
- `public/users/<id>.json` - Per-user detail pages

## GitHub API Usage

### Authentication

```javascript
// Required environment variable
process.env.GITHUB_TOKEN
```

### Rate Limiting

| API | Limit | Strategy |
|-----|-------|----------|
| Code Search | 10/min | Bottleneck queue |
| REST API | 5000/hr | Bottleneck queue |
| GraphQL | 5000 pts/hr | Per-query tracking |

### Batching

```javascript
// Repo batching (15 per query)
const REPO_BATCH_SIZE = 15;

// File batching (20 per query)
const FILE_BATCH_SIZE = 20;
```

### Retry Strategy

```javascript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

// Retries on: 5xx errors, network failures
// No retry on: 404, 403 (rate limit without reset)
```

## Caching

### Strategy

| Data | Cache Key | TTL |
|------|-----------|-----|
| Trees | Commit SHA | Never expires (immutable) |
| Users | Username | 24 hours |

### Implementation

```javascript
// Cache location
const CACHE_DIR = './data/.cache';

// Cache format
tree_<sha>.json
user_<username>.json
```

### Security

- **Path validation:** Prevents directory traversal
- **Forbidden keys:** Blocks `__proto__`, `constructor`, `prototype`
- **Filename sanitization:** Replaces special characters

## Security Measures

### Input Sanitization

```javascript
// GraphQL injection prevention
function sanitizeForGraphQL(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
```

### Cache Security

```javascript
// Path traversal protection
function validateCachePath(filepath) {
  const resolved = resolve(filepath);
  if (!resolved.startsWith(resolve(CACHE_DIR) + '/')) {
    throw new Error('Path traversal detected');
  }
}

// Prototype pollution prevention
const FORBIDDEN_IDS = ['__proto__', 'constructor', 'prototype'];
```

### Token Handling

```javascript
// Lazy initialization prevents crashes on import
function getOctokit() {
  if (!_octokit) {
    validateToken(); // Throws if missing
    _octokit = new ThrottledOctokit({ auth: process.env.GITHUB_TOKEN });
  }
  return _octokit;
}
```

## Data Models

### Marketplace (input)

```json
{
  "name": "my-marketplace",
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin"
    }
  ]
}
```

### Plugin (enriched output)

```json
{
  "name": "my-plugin",
  "description": "...",
  "source": ".claude-plugin/plugins/my-plugin",
  "install_commands": [
    "/plugin marketplace add owner/repo",
    "/plugin install my-plugin@my-marketplace"
  ],
  "signals": {
    "stars": 1000,
    "forks": 100,
    "pushed_at": "2026-01-12T00:00:00Z"
  },
  "commands": [...],
  "skills": [...]
}
```

### User (output)

```json
{
  "id": "vercel",
  "display_name": "Vercel",
  "type": "Organization",
  "avatar_url": "https://...",
  "stats": {
    "total_repos": 1,
    "total_plugins": 3,
    "total_stars": 137000
  }
}
```

## Error Handling

### Soft Failures (logged, continue)

- Missing optional files
- Invalid JSON/YAML (marked invalid)
- Binary files (skipped)
- 404 responses

### Hard Failures (exit)

- Missing `GITHUB_TOKEN`
- File I/O errors
- Pipeline step crashes

### Validation Reporting

```javascript
// Included in 05-parsed.json
{
  "validation": {
    "marketplaces": { "valid": 3, "invalid": 1 },
    "errors": [
      {
        "context": "owner/repo/.claude-plugin/marketplace.json",
        "errors": ["marketplace.json requires 'plugins' field"]
      }
    ]
  }
}
```

## Performance

### Typical Run (3 repos)

| Metric | Value |
|--------|-------|
| Total time | ~15 seconds |
| API calls | ~15 (vs ~229 without batching) |
| Cache hit rebuild | ~11 seconds |

### Scaling

| Repos | Estimated Time | API Calls |
|-------|----------------|-----------|
| 10 | ~30 seconds | ~50 |
| 100 | ~5 minutes | ~200 |
| 1000 | ~30 minutes | ~1500 |

## Design Decisions

### Why marketplace.json as source of truth?

- Explicit plugin boundaries
- Lower spam risk (curated by maintainers)
- Canonical install commands

### Why user-centric model?

- Users follow creators, not categories
- Natural social proof aggregation
- Better discoverability

### Why static JSON output?

- No database required
- CDN-friendly
- Easy to version control
- Schema changes are explicit

### Why GraphQL batching?

- 90% fewer API calls
- Better rate limit efficiency
- Simpler to manage quotas

## Limitations

1. Only indexes repos with `marketplace.json`
2. No real-time updates (regenerated periodically)
3. No search by command/skill name
4. No ratings or reviews

## Future Improvements

1. Standalone skill repo discovery
2. Real-time webhook updates
3. Search index generation
4. Dependency tracking between plugins
