# Agent Mart Web Frontend

A Next.js application for browsing the Claude Code plugin marketplace.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Homepage - marketplace overview
│   ├── layout.tsx          # Root layout with navigation
│   ├── globals.css         # Global styles and Tailwind
│   ├── author/[id]/        # Author detail page
│   ├── authors/            # Authors listing page
│   ├── marketplace/        # Marketplace browsing
│   │   └── [author]/       # Author's marketplace
│   └── plugin/[author]/[marketplace]/  # Plugin detail page
├── components/             # Reusable UI components
│   ├── CopyableCommand.tsx # Command with copy button
│   ├── ErrorState.tsx      # Error display component
│   ├── FileTree.tsx        # Repository file tree
│   ├── LoadingState.tsx    # Loading spinner
│   ├── MarketplaceCard.tsx # Marketplace preview card
│   ├── NavBar.tsx          # Navigation header
│   └── PluginCard.tsx      # Plugin preview card
└── lib/                    # Utilities and types
    ├── constants.ts        # API URLs, config
    ├── types.ts            # TypeScript interfaces
    └── useFetch.ts         # Data fetching hook
```

## Data Flow

The frontend fetches static JSON from the pipeline output:

1. **Index data** - `public/index.json` provides the marketplace overview
2. **Author data** - `public/authors/<id>.json` provides author details
3. **Plugin data** - Nested within author JSON files

## Development Notes

### Adding a New Page

1. Create a directory in `src/app/` with the route name
2. Add a `page.tsx` file with a default export
3. Use the `useFetch` hook for data fetching
4. Wrap content with `LoadingState` and `ErrorState` for UX

### Component Guidelines

- Use TypeScript interfaces for all props
- Keep components focused and reusable
- Use Tailwind classes for styling
- Include proper accessibility attributes

### Styling

This project uses Tailwind CSS. Configuration is in `tailwind.config.ts`.

Common patterns:
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Dark mode: `dark:` prefix (if enabled)
- Hover states: `hover:` prefix

## Related Documentation

- [Root README](../README.md) - Project overview
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Pipeline architecture
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
