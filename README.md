# Agent Mart

Discover and install [Claude Code plugins](https://code.claude.com/docs/en/plugin-marketplaces) published on GitHub.

**[agentmart.cc](https://agentmart.cc)**

<img width="1536" height="688" alt="Agent Mart" src="https://github.com/user-attachments/assets/757896e8-1add-4809-aa98-fdf2b01fced7" />

### Home Page

The home page displays all indexed marketplaces as cards. Each card shows:

- Marketplace name and description
- Author name and avatar
- GitHub stars, forks and last updated time

### Browse Plugins
- **Search** - Find plugins by name, description, author, or category keyword/tag
- **Filter** - Narrow results by selecting one or more categories
- **Sort** - Order by popularity, trending, or last updated
  - **Popularity** - Total GitHub stars
  - **Trending** - Recent star velocity compared to historical average (z-score algorithm)
  - **Last Updated** - Most recently pushed to GitHub
 
Filter state is synced to URL parameters for shareable links.

<img width="1687" height="971" alt="Screenshot 2026-01-30 at 1 50 09 PM" src="https://github.com/user-attachments/assets/5be5d24c-15f6-480e-bbbc-f60551889acb" />

### Marketplace Detail Page

Click any card to view the full marketplace details:
- **Marketplace hero** - Core details from the home page: marketplace name and description, author name and avatar, GitHub stars, forks, last updated time, and direct link to the source repository.
- **Plugin carousel** - Cycle through all plugins in the marketplace to see their descriptions, install commands, and READMEs for quick documentation.

<img width="1689" height="974" alt="Screenshot 2026-01-30 at 1 51 36 PM" src="https://github.com/user-attachments/assets/53d3b6dc-dba4-4d54-8846-6f8b7e398afb" />

## How It Works

Agent Mart crawls GitHub repositories for `marketplace.json` files and builds a searchable directory. All data comes directly from GitHub - no manual curation or separate database.

## Project Structure

```
agent-mart/
├── src/
│   ├── lib/              # GitHub client, cache, parsers, validators, categorizer
│   └── pipeline/         # 8-step ETL pipeline (01-discover to 09-output)
├── scripts/              # Pipeline orchestrator and visualizer
├── tests/                # ETL unit tests
├── web/public/data/      # Generated JSON output
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
