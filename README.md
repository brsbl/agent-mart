<img width="1536" height="688" alt="Rectangle" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

# Agent Mart

A marketplace directory of Claude Code plugins.

**GitHub as the source of truth** - All marketplace data is crawled directly from GitHub repositories, specifically from Claude Code `marketplace.json` files. No manual curation or separate database.

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
npm run pipeline

# Run with visualization (opens browser with real-time progress)
npm run pipeline:dev

# Run with limited repos (for testing)
REPO_LIMIT=3 npm run pipeline
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
npm run pipeline       # Run full ETL pipeline
npm run pipeline:dev   # Run pipeline with real-time visualization
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

## Project Structure

```
agent-mart/
├── src/
│   ├── lib/              # GitHub client, cache, parsers, validators, categorizer
│   └── pipeline/         # 8-step ETL pipeline (01-discover to 08-categorize)
├── scripts/              # Pipeline orchestrator and visualizer
├── tests/                # ETL unit tests
├── data/                 # Intermediate pipeline files (gitignored)
├── public/               # Generated JSON output
└── web/                  # Next.js frontend application
```

## Documentation

- [Pipeline Architecture](./src/pipeline/README.md) - 8-step ETL process
- [Core Libraries](./src/lib/README.md) - Utilities, schemas, and categorization
- [Build Scripts](./scripts/README.md) - Pipeline orchestration and visualizer
- [Testing Guide](./tests/README.md) - Test patterns and running tests
- [CI/CD Workflows](./.github/workflows/README.md) - GitHub Actions setup
- [Web Frontend](./web/README.md) - Next.js application
- [Contributing](./CONTRIBUTING.md) - Development guidelines

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

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.
