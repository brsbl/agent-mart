# Agent Mart

A marketplace-first directory builder for Claude Code plugins, skills, and commands. Crawls GitHub for repositories containing Claude Code marketplace definitions, enriches them with metadata, and generates static JSON artifacts.

## Features

- **7-step ETL pipeline** - Discover, fetch, parse, enrich, and output
- **GraphQL batching** - 90% fewer GitHub API calls
- **SHA-based caching** - Fast rebuilds for unchanged repos
- **User-centric model** - Browse by creator, not category
- **Static JSON output** - CDN-friendly, no database required

## Quick Start

```bash
# Install dependencies
npm install

# Set up GitHub token
cp .env.example .env
# Edit .env and add your GITHUB_TOKEN

# Run the pipeline
npm run build

# Run with limited repos (for testing)
REPO_LIMIT=3 npm run build
```

## Requirements

- Node.js >= 20.0.0
- GitHub Personal Access Token with `public_repo` scope

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub API token ([create one](https://github.com/settings/tokens)) |
| `REPO_LIMIT` | No | Limit repos to process (for testing) |

## Scripts

```bash
npm run build      # Run full pipeline
npm test           # Run test suite (41 tests)
npm run lint       # Check code style
npm run lint:fix   # Auto-fix lint issues
```

## Output

The pipeline generates:

```
public/
  index.json           # Directory homepage with all users
  users/
    vercel.json        # Per-user detail files
    anthropics.json
    ...
```

### index.json Structure

```json
{
  "meta": {
    "total_users": 3,
    "total_repos": 3,
    "total_plugins": 5,
    "generated_at": "2026-01-12T02:33:28.814Z"
  },
  "users": [
    {
      "id": "vercel",
      "display_name": "Vercel",
      "type": "Organization",
      "avatar_url": "https://...",
      "stats": { "total_stars": 137089, ... }
    }
  ]
}
```

## Pipeline Steps

| Step | Description | Output |
|------|-------------|--------|
| 01-discover | Find repos with `marketplace.json` | Discovered repos |
| 02-fetch-repos | Fetch repo & owner metadata | Repo details |
| 03-fetch-trees | Download file structures | File trees |
| 04-fetch-files | Fetch specific files | File contents |
| 05-parse | Parse & validate files | Parsed data |
| 06-enrich | Build owner-centric model | Enriched data |
| 07-output | Generate public JSON | Final output |

## Performance

| Metric | Value |
|--------|-------|
| API calls (3 repos) | ~15 (vs ~229 without batching) |
| Build time (3 repos) | ~15 seconds |
| Cache hit rebuild | ~11 seconds |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation of:
- Data flow and pipeline design
- GitHub API usage patterns
- Caching strategy
- Security measures
- Output schemas

## Security

- **Path traversal protection** - Cache paths validated against base directory
- **Prototype pollution prevention** - Forbidden keys blocked in cache
- **GraphQL injection prevention** - All inputs sanitized before queries
- **Lazy token validation** - Graceful handling in test environments

## Testing

```bash
npm test
```

41 tests covering:
- Validators (marketplace, plugin, skill schemas)
- Parsers (JSON, YAML frontmatter, command names)
- Security (cache keys, GraphQL sanitization)
- File patterns (SKILL.md, commands, etc.)

## GitHub Action

The pipeline runs nightly via GitHub Actions at 2 AM UTC. To set up:

1. Go to **Settings → Secrets and variables → Actions**
2. Create a secret named `PIPELINE_GITHUB_TOKEN` with a GitHub PAT that has `public_repo` scope
3. The workflow will:
   - Run the full pipeline
   - Commit updated `public/` files automatically
   - Upload artifacts for 30 days

You can also trigger manually from **Actions → Nightly Build → Run workflow**.

## License

MIT
