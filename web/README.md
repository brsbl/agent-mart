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

---

## Architecture

### Data Flow

```
┌──────────────────────┐
│ web/public/data/     │
│  ├── index.json      │
│  ├── categories.json │
│  ├── marketplaces-   │
│  │   browse.json     │
│  ├── plugins-        │
│  │   browse.json     │
│  └── authors/*.json  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ web/src/lib/data.ts  │
│  loadMarketplaces()  │
│  loadCategories()    │
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
| `/` | `app/page.tsx` | Homepage with category filters |
| `/[author]` | `app/[author]/page.tsx` | Author detail page |
| `/[author]/[marketplace]` | `app/[author]/[marketplace]/page.tsx` | Marketplace detail |

### Filter System

The homepage implements two-dimensional filtering:

```typescript
// State
const [selectedTechStack, setSelectedTechStack] = useState<Set<TechStack>>(new Set());
const [selectedCapabilities, setSelectedCapabilities] = useState<Set<Capability>>(new Set());

// Filter logic (AND within each dimension)
const filtered = marketplaces.filter(m => {
  // Must have ALL selected tech stack
  for (const tech of selectedTechStack) {
    if (!m.categories?.techStack?.includes(tech)) return false;
  }
  // Must have ALL selected capabilities
  for (const cap of selectedCapabilities) {
    if (!m.categories?.capabilities?.includes(cap)) return false;
  }
  return true;
});
```

Note: Filters are implemented inline in `page.tsx`, not as a separate component.

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
