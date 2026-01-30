# Agent Mart Web Frontend

[Back to main README](../README.md)

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
| `npm test` | Run tests in watch mode |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Homepage - marketplace browsing
│   ├── layout.tsx          # Root layout with navigation
│   ├── globals.css         # Global styles and Tailwind
│   └── [author]/
│       └── [marketplace]/
│           └── page.tsx    # Marketplace detail page
├── components/             # Reusable UI components
│   ├── CopyableCommand.tsx # Command with copy button
│   ├── ErrorState.tsx      # Error display component
│   ├── LoadingState.tsx    # Loading spinner
│   ├── MarketplaceCard.tsx # Marketplace preview card
│   ├── NavBar.tsx          # Navigation header
│   ├── PluginCard.tsx      # Plugin preview card
│   ├── SearchFilterControls.tsx  # Search, filter, sort controls
│   ├── MultiSelectDropdown.tsx   # Category filter dropdown
│   └── SortDropdown.tsx    # Sort options dropdown
├── hooks/                  # Custom React hooks
│   └── useFetch.ts         # Data fetching hook
└── lib/                    # Utilities and types
    ├── constants.ts        # API URLs, config
    ├── types.ts            # TypeScript interfaces
    └── data.ts             # Data utilities
```

---

## Architecture

### Data Flow

```
┌──────────────────────┐
│ web/public/data/     │
│  ├── marketplaces-   │
│  │   browse.json     │
│  └── authors/*.json  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ web/src/lib/data.ts  │
│  loadMarketplaces()  │
│  loadAuthorData()    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Server Components    │
│  ├── page.tsx        │
│  ├── [author]/       │
│  └── [marketplace]/  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Client Components    │
│  ├── MarketplaceCard │
│  └── CategoryPill    │
└──────────────────────┘
```

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Homepage with search, filter, and sort |
| `/[author]/[marketplace]` | `app/[author]/[marketplace]/page.tsx` | Marketplace detail with plugins |

### Search and Filter System

The homepage implements search, category filtering, and sorting:

- **Search** - Text search across name, description, author, and keywords
- **Categories** - Multi-select dropdown filtering by category (OR logic)
- **Sort** - Order by popularity (stars), trending (z-score), or last updated

Filter state is synced to URL parameters for shareable links.

---

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

---

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:ci

# Run with coverage
npm run test:coverage
```

See [tests/README.md](../tests/README.md) for more details on test patterns.

---

## Related Documentation

- [Root README](../README.md) - Project overview
- [Core Libraries](../src/lib/README.md) - Data schemas and types
- [Contributing](../CONTRIBUTING.md) - Contribution guidelines
