# Pipeline Architecture

[Back to main README](../../README.md)

This document describes the ETL pipeline for Agent Mart, which builds a directory of Claude Code plugins.

## Overview

The pipeline has 8 steps that:
1. Discovers Claude Code marketplaces on GitHub
2. Fetches repository and author metadata
3. Downloads and parses plugin definitions
4. Generates static JSON for a public directory

```
GitHub API
    │
    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 01-discover │ ──► │ 02-fetch-    │ ──► │ 04-fetch-   │
│             │     │    repos     │     │    files    │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
    ┌──────────────────────────────────────────┘
    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 05-parse    │ ──► │ 06-enrich    │ ──► │ 07-snapshot │
│             │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
    ┌──────────────────────────────────────────┘
    ▼
┌───────────────┐     ┌─────────────┐
│ 08-aggregate  │ ──► │ 09-output   │ ──► web/public/data/
│               │     │             │     authors/, marketplaces-browse.json
└───────────────┘     └─────────────┘
```

## Directory Structure

```
src/
├── lib/
│   ├── github.js      # GitHub API client (GraphQL + REST)
│   ├── cache.js       # File-based caching
│   ├── parser.js      # JSON/YAML/Markdown parsing
│   ├── validator.js   # Schema validation
│   ├── categories.js  # Category normalization
│   └── utils.js       # General utilities
└── pipeline/
    ├── 01-discover.js
    ├── 02-fetch-repos.js
    ├── 04-fetch-files.js
    ├── 05-parse.js
    ├── 06-enrich.js
    ├── 07-snapshot.js
    ├── 08-aggregate.js
    └── 09-output.js

data/                  # Intermediate files (gitignored)
├── .cache/            # SHA-based cache
├── 01-discovered.json
├── 02-repos.json
└── ...

web/public/data/       # Final output (served by Next.js)
├── authors/*.json
└── marketplaces-browse.json
```

## Data Model

The pipeline produces an **author-centric** data model:

```
Author
└── Marketplace[]
    └── Plugin[]
        ├── Command[]
        └── Skill[]
```

### Author
```json
{
  "id": "anthropics",
  "display_name": "Anthropic",
  "type": "Organization",
  "avatar_url": "https://...",
  "stats": {
    "total_marketplaces": 1,
    "total_plugins": 5,
    "total_stars": 55000,
    "total_forks": 3000
  }
}
```

### Marketplace (includes repo metadata)
```json
{
  "name": "claude-code-plugins",
  "description": "Official plugins",
  "repo_full_name": "anthropics/claude-code",
  "repo_url": "https://github.com/anthropics/claude-code",
  "signals": { "stars": 55000, "forks": 3000, "pushed_at": "..." },
  "keywords": ["claude", "plugins"],
  "files": {...},
  "plugins": [...]
}
```

### Plugin
```json
{
  "name": "agent-sdk-dev",
  "description": "Development kit for Claude Agent SDK",
  "category": "development",
  "install_commands": [
    "/plugin marketplace add anthropics/claude-code",
    "/plugin install agent-sdk-dev@claude-code-plugins"
  ],
  "commands": [...],
  "skills": [...]
}
```

## Pipeline Steps

### Step 1: Discover
**File:** `01-discover.js`

Uses GitHub code search to find marketplace repositories:
```
path:.claude-plugin filename:marketplace.json
```

### Step 2: Fetch Repos
**File:** `02-fetch-repos.js`

Fetches repository and author metadata using GraphQL batching (15 repos per query).

### Step 3: Fetch Files
**File:** `04-fetch-files.js` (note: file numbering has a gap since step 03 was removed)

Two-pass file fetching:
1. Fetches base files: `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `README.md`
2. Parses marketplace.json to find plugin source paths, then fetches `{source}/README.md` for each plugin

The repo-level README serves as a fallback when plugins don't have their own README.

### Step 4: Parse
**File:** `05-parse.js`

Parses and validates all fetched files (JSON, YAML frontmatter).

### Step 5: Enrich
**File:** `06-enrich.js`

Builds the author-centric data model:
- Groups marketplaces by author
- Normalizes categories
- Generates install commands
- Calculates stats

### Step 6: Snapshot
**File:** `07-snapshot.js`

Records current star/fork counts to `data/signals-history.json` for trending score calculation:
- Loads current marketplace data
- Skips if already recorded today
- Records snapshot for each repository
- Prunes entries older than 90 days

### Step 7: Aggregate
**File:** `08-aggregate.js`

Aggregates categories from plugins for each marketplace:
- Collects unique categories from all plugins
- Generates category statistics
- Outputs `marketplaces-categorized.json` and `category-stats.json`

### Step 8: Output
**File:** `09-output.js`

Generates public JSON files:
- `authors/*.json` - Full author detail
- `marketplaces-browse.json` - Lightweight marketplace list with trending scores

## Category Normalization

Categories are normalized to 21 canonical values during enrichment:

```
development, ai-ml, productivity, automation, devops,
testing, quality, security, database, api,
infrastructure, integration, design, documentation, git,
frameworks, languages, utilities, business, marketing, learning
```

See `src/lib/categories.js` for alias mappings.

## GitHub API Usage

### Rate Limiting

| API | Limit | Strategy |
|-----|-------|----------|
| Code Search | 10/min | Bottleneck queue |
| REST API | 5000/hr | Bottleneck queue |
| GraphQL | 5000 pts/hr | Per-query tracking |

### Caching

File content is fetched via GraphQL batching for efficiency.

## Running the Pipeline

```bash
# Full pipeline
npm run pipeline

# Individual steps
node src/pipeline/06-enrich.js
node src/pipeline/07-snapshot.js
node src/pipeline/08-aggregate.js
node src/pipeline/09-output.js
```

Requires `GITHUB_TOKEN` environment variable.
