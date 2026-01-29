<img width="1536" height="688" alt="Agent Mart" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

# Agent Mart

Discover and install plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

**[agentmart.dev](https://agentmart.dev)**

## Browse Plugins

Agent Mart indexes [Claude Code plugins](https://code.claude.com/docs/en/plugin-marketplaces) published on GitHub. Browse by category, search by keyword, or sort by popularity and recency.

## Install a Plugin

Copy the install command from any plugin page:

```bash
claude mcp add-json <plugin-name> '<json-config>'
```

Or install directly from a GitHub repository:

```bash
claude mcp add-from-claude-plugin https://github.com/<owner>/<repo>
```

## How It Works

Agent Mart crawls GitHub repositories for `marketplace.json` files and builds a searchable directory. All data comes directly from GitHub - no manual curation or separate database.

## Project Structure

```
agent-mart/
├── src/
│   ├── lib/              # GitHub client, cache, parsers, validators, categorizer
│   └── pipeline/         # 8-step ETL pipeline (01-discover to 08-categorize)
├── scripts/              # Pipeline orchestrator and visualizer
├── tests/                # ETL unit tests
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

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/anthropics/agent-mart/issues).

## License

MIT
