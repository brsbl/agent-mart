<img width="1536" height="688" alt="Rectangle" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

# Agent Mart

A marketplace-first directory builder for Claude Code plugins, skills, and commands. Crawls GitHub for repositories containing Claude Code marketplace definitions, enriches them with metadata, and generates static JSON artifacts.

## Features

- **8-step ETL pipeline** - Discover, fetch, parse, enrich, categorize, and output
- **Real-time pipeline visualization** - Monitor progress with HTML reports
- **GraphQL batching** - 90% fewer GitHub API calls
- **SHA-based caching** - Fast rebuilds for unchanged repos
- **Rules-based categorization** - 12 unified categories
- **Next.js frontend** - Browse the marketplace at [agentmart.dev](https://agentmart.dev)
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

# Run with visualization (opens browser with real-time progress)
npm run build:dev

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

## NPM Scripts

```bash
npm run build          # Run full ETL pipeline
npm run build:dev      # Run pipeline with real-time visualization
npm test               # Run ETL test suite
npm run test:web       # Run web frontend tests
npm run test:all       # Run all tests (ETL + web)
npm run lint           # Check code style
npm run lint:fix       # Auto-fix lint issues
```

## Output

The pipeline generates:

```
public/
  index.json           # Directory homepage with all owners
  plugins-browse.json  # Flat list of all plugins with categories
  category-taxonomy.json # Category definitions
  owners/
    vercel.json        # Per-owner detail files
    anthropics.json
    ...
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
| 08-categorize | Extract categories via rules | Categorized data |

## Categorization System

The pipeline uses a rules-based categorization system with 12 unified categories. Categories are extracted by matching patterns and keywords in marketplace descriptions, plugin names, command descriptions, and skill descriptions.

| Category | Label | Example Patterns |
|----------|-------|------------------|
| `knowledge-base` | Agent Memory | memory, rag, retrieval, embeddings |
| `templates` | Templates | template, scaffold, boilerplate, starter |
| `devops` | DevOps | ci/cd, kubernetes, terraform, docker |
| `code-quality` | Code Quality | lint, format, refactor, eslint |
| `code-review` | Code Review | code review, pr review |
| `testing` | Testing | test, jest, vitest, pytest, e2e |
| `data-analytics` | Data & Analytics | analytics, sql, etl, visualization |
| `design` | Design | ui/ux, figma, design system, tailwind |
| `documentation` | Documentation | docs, readme, jsdoc, typedoc |
| `planning` | Planning | plan, spec, prd, roadmap |
| `security` | Security | security, auth, vulnerability |
| `orchestration` | Orchestration | multi-agent, swarm, crew |

For complete pattern definitions, see [`src/lib/categorizer.js`](./src/lib/categorizer.js).

## Performance

| Metric | Value |
|--------|-------|
| API calls (3 repos) | ~15 (vs ~229 without batching) |
| Build time (3 repos) | ~15 seconds |
| Cache hit rebuild | ~11 seconds |

## Project Structure

```
agent-mart/
├── src/
│   ├── lib/              # GitHub client, cache, parsers, validators, categorizer
│   └── pipeline/         # 8-step ETL pipeline (01-discover to 08-categorize)
├── scripts/
│   ├── build.js          # Pipeline orchestrator
│   └── etl-visualizer/   # Real-time HTML visualization
│       ├── run.js        # Runs pipeline with visualization
│       ├── md-to-html.js # HTML report generator
│       └── output/       # Generated reports
├── tests/                # ETL unit tests
├── data/                 # Intermediate pipeline files (gitignored)
├── public/               # Generated JSON output
└── web/                  # Next.js frontend application
    ├── src/app/          # App router pages
    ├── src/components/   # React components
    ├── src/lib/          # Utilities and data fetching
    └── tests/            # Frontend tests
```

## Development

### Using the Visualizer

For local development, use the visualizer to monitor pipeline progress in real-time:

```bash
npm run build:dev
```

This opens a browser with a live-updating HTML report showing:
- Stage progress with timing
- Metrics before/after each stage
- Validation errors
- Data previews

The report is saved to `scripts/etl-visualizer/output/pipeline-status.html`.

### Running Tests

```bash
# Run all tests
npm run test:all

# Run only ETL tests
npm test

# Run only web tests
npm run test:web

# Run web tests in watch mode
cd web && npm test
```

## GitHub Actions

### CI Workflow

Runs on every push and pull request:
- Linting
- ETL tests
- Web frontend tests

### Nightly Build

Runs daily at 2 AM UTC:
- Full ETL pipeline with visualization
- Uploads `public/` directory as artifact
- Uploads visualization report as artifact
- Creates PR with updated data

To set up:

1. Go to **Settings → Secrets and variables → Actions**
2. Create a secret named `PIPELINE_GITHUB_TOKEN` with a GitHub PAT that has `public_repo` scope
3. The workflow will run automatically, or trigger manually from **Actions → Nightly Build → Run workflow**

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

## Web Frontend

The Next.js web application provides a browsable interface for the plugin directory.

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to browse the marketplace.

See [web/README.md](./web/README.md) for frontend-specific documentation.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.
