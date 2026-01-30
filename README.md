<img width="1536" height="688" alt="Agent Mart" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

# Agent Mart

Discover and install plugins for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

**[agentmart.cc](https://agentmart.cc)**

## Features

### Browse Plugins

Agent Mart indexes [Claude Code plugins](https://code.claude.com/docs/en/plugin-marketplaces) published on GitHub.

- **Search** - Find plugins by name, description, author, or keyword
- **Filter** - Narrow results by selecting one or more categories
- **Sort** - Order by popularity, trending, or last updated
  - **Popularity** - Total GitHub stars
  - **Trending** - Recent star velocity compared to historical average (z-score algorithm)
  - **Last Updated** - Most recently pushed to GitHub

### Install Plugins

Copy the install commands from any plugin page and run them in Claude Code:

```
/plugin marketplace add <owner>/<repo>
/plugin install <plugin-name>@<marketplace-name>
```

## Pages

### Home Page

The home page displays all indexed marketplaces as cards. Each card shows:

- Marketplace name and description
- Author name and avatar
- GitHub stars and trending indicator (when applicable)
- Category tags

Use the search bar to find plugins by text, filter by categories, and sort results.

### Marketplace Detail Page

Click any card to view the full marketplace details:

- **Plugin list** - All plugins in the marketplace with descriptions and install commands
- **README preview** - Documentation from the repository
- **Quick install** - One-click copy for install commands
- **GitHub link** - Direct link to the source repository

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
