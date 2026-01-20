<img width="1536" height="688" alt="Rectangle" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

# Agent Mart

A marketplace-first directory builder for Claude Code plugins, skills, and commands. Crawls GitHub for repositories containing Claude Code marketplace definitions, enriches them with metadata, and generates static JSON artifacts.

## Features

- **8-step ETL pipeline** - Discover, fetch, parse, enrich, categorize, and output
- **GraphQL batching** - 90% fewer GitHub API calls
- **SHA-based caching** - Fast rebuilds for unchanged repos
- **Owner-centric model** - Browse by creator, not category
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
npm run build          # Run full pipeline
npm run etl:visualize  # Visualize ETL pipeline stages
npm test               # Run test suite
npm run lint           # Check code style
npm run lint:fix       # Auto-fix lint issues
```

## Output

The pipeline generates:

```
public/
  index.json           # Directory homepage with all owners
  owners/
    vercel.json        # Per-owner detail files
    anthropics.json
    ...
```

### index.json Structure

```json
{
  "meta": {
    "total_owners": 3,
    "total_repos": 3,
    "total_plugins": 5,
    "generated_at": "2026-01-12T02:33:28.814Z"
  },
  "owners": [
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
| 08-categorize | Extract categories via rules | Categorized data |
| 07-output | Generate public JSON | Final output |

## Categorization System

The pipeline uses a rules-based categorization system to classify marketplaces across two dimensions.

### Tech Stack
What technologies the marketplace works with. Detected via text patterns and file presence.

| Category | Label | Files | Patterns |
|----------|-------|-------|----------|
| `nextjs` | Next.js | `next.config.{js,ts,mjs}` | "next.js", "app router", "pages router" |
| `react` | React | — | "react", "react components" *(excluded if Next.js)* |
| `vue` | Vue | `vue.config.js`, `nuxt.config.{js,ts}` | "vue", "nuxt" |
| `python` | Python | `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` | "django", "fastapi", "flask", "pytest" |
| `node` | Node.js | `package.json` | "node.js", "express", "koa", "fastify", "nest.js" *(excluded if Next.js/React/Vue)* |
| `typescript` | TypeScript | `tsconfig.json` | "typescript", "tsc" |
| `go` | Go | `go.mod`, `go.sum` | "golang", "go module" |
| `rust` | Rust | `Cargo.toml`, `Cargo.lock` | "rust", "cargo" |
| `supabase` | Supabase | `supabase/config.toml` | "supabase" |
| `aws` | AWS | `serverless.yml`, `template.yaml`, `cdk.json` | "aws", "ec2", "dynamodb", "cloudformation", "cdk" |
| `docker` | Docker | `Dockerfile`, `docker-compose.{yml,yaml}`, `.dockerignore` | "docker", "docker-compose" |
| `postgres` | PostgreSQL | — | "postgres", "postgresql" |

### Capabilities
What the agent/marketplace does. Detected via text patterns with anti-patterns to reduce false positives.

| Category | Label | Patterns | Anti-patterns (excluded) |
|----------|-------|----------|--------------------------|
| `orchestration` | Orchestration | "multi-agent", "swarm", "crew", "agent framework" | — |
| `memory` | Memory | "rag", "vector store", "embeddings", "long-term memory" | "memory leak", "out of memory" |
| `browser-automation` | Browser Automation | "playwright", "puppeteer", "selenium", "cypress" | — |
| `boilerplate` | Boilerplate | "scaffold", "generator", "boilerplate", "starter kit" | "template literal" |
| `review` | Code Review | "code review", "pr review", "eslint", "prettier", "refactor" | — |
| `testing` | Testing | "test", "jest", "vitest", "pytest", "e2e", "unit test", "tdd" | "test data", "test file" |
| `devops` | DevOps | "kubernetes", "k8s", "terraform", "ansible", "ci/cd", "deploy" | "etl pipeline", "data pipeline" |
| `documentation` | Documentation | "jsdoc", "typedoc", "sphinx", "mkdocs", "api docs" | "read the docs", "see docs" |

For complete pattern definitions, see [`src/lib/categorizer.js`](./src/lib/categorizer.js). Run `node src/pipeline/08-categorize.js` to regenerate categories.

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

## Web Frontend

The project includes a Next.js web application for browsing the plugin directory.

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to browse the marketplace.

See [web/README.md](./web/README.md) for frontend-specific documentation.

## Project Structure

```
agent-mart/
├── src/
│   ├── lib/          # GitHub client, cache, parsers, validators, categorizer
│   └── pipeline/     # 8-step ETL pipeline (01-discover to 08-categorize)
├── scripts/          # Build orchestrator
├── tests/            # Unit tests
├── data/             # Intermediate pipeline files (gitignored)
├── public/           # Generated JSON output
└── web/              # Next.js frontend application
    ├── src/app/      # App router pages
    ├── src/components/
    └── src/lib/
```

## GitHub Action

The pipeline runs nightly via GitHub Actions at 2 AM UTC. To set up:

1. Go to **Settings → Secrets and variables → Actions**
2. Create a secret named `PIPELINE_GITHUB_TOKEN` with a GitHub PAT that has `public_repo` scope
3. The workflow will:
   - Run the full pipeline
   - Commit updated `public/` files automatically
   - Upload artifacts for 30 days

You can also trigger manually from **Actions → Nightly Build → Run workflow**.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.
