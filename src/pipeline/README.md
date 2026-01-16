# Pipeline Architecture

This document describes the ETL pipeline for Agent Mart, which builds a directory of Claude Code plugins.

## Overview

Agent Mart is a 7-step ETL (Extract, Transform, Load) pipeline that:
1. Discovers Claude Code marketplaces on GitHub
2. Fetches repository and author metadata
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
│ 07-output   │ ──► web/public/data/index.json
│             │     web/public/data/authors/*.json
└─────────────┘     web/public/data/*-browse.json
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
    ├── 03-fetch-trees.js
    ├── 04-fetch-files.js
    ├── 05-parse.js
    ├── 06-enrich.js
    └── 07-output.js

data/                  # Intermediate files (gitignored)
├── .cache/            # SHA-based cache
├── 01-discovered.json
├── 02-repos.json
└── ...

web/public/data/       # Final output (served by Next.js)
├── index.json
├── authors/*.json
├── plugins-browse.json
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
    "total_commands": 12,
    "total_skills": 8
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
  "file_tree": [...],
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

### Step 3: Fetch Trees
**File:** `03-fetch-trees.js`

Downloads full file structure for each repository. Cached by commit SHA.

### Step 4: Fetch Files
**File:** `04-fetch-files.js`

Downloads specific files matching patterns:
- `marketplace.json`
- `plugin.json`
- `commands/*.md`
- `skills/*/SKILL.md`

### Step 5: Parse
**File:** `05-parse.js`

Parses and validates all fetched files (JSON, YAML frontmatter).

### Step 6: Enrich
**File:** `06-enrich.js`

Builds the author-centric data model:
- Groups marketplaces by author
- Normalizes categories
- Generates install commands
- Calculates stats

### Step 7: Output
**File:** `07-output.js`

Generates public JSON files:
- `index.json` - Author list with stats
- `authors/*.json` - Full author detail
- `plugins-browse.json` - Lightweight plugin list for search
- `marketplaces-browse.json` - Lightweight marketplace list

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

Trees are cached by commit SHA (immutable, never expires).

## Running the Pipeline

```bash
# Full pipeline
npm run build

# Individual steps
node src/pipeline/06-enrich.js
node src/pipeline/07-output.js
```

Requires `GITHUB_TOKEN` environment variable.
