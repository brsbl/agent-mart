# Agent Mart - Claude Code Context

This file provides context and best practices for Claude Code when working on this project.

## Project Overview

Agent Mart is a marketplace directory for Claude Code plugins. It consists of:
1. **ETL Pipeline** (Node.js) - Crawls GitHub for marketplace definitions
2. **Web Frontend** (Next.js) - Displays the plugin directory

## Architecture

```
agent-mart/
├── src/lib/          # Core utilities (JS, ES modules)
├── src/pipeline/     # 8-step ETL pipeline
├── scripts/          # Build tools and visualizer
├── tests/            # Node.js test runner tests
├── data/             # Pipeline intermediate data and cache
├── web/              # Next.js 16 frontend (TypeScript)
│   ├── src/app/      # App Router pages
│   ├── src/components/
│   ├── src/hooks/
│   └── src/lib/
└── web/public/data/  # Generated JSON output
```

---

## General Best Practices

### Code Quality

- **Single Responsibility**: Each function/component does one thing well
- **DRY (Don't Repeat Yourself)**: Extract repeated logic into shared utilities
- **KISS (Keep It Simple)**: Prefer simple solutions over clever ones
- **Early Returns**: Exit functions early to reduce nesting

```javascript
// Good - early return
function processUser(user) {
  if (!user) return null;
  if (!user.isActive) return null;
  return transformUser(user);
}

// Bad - deeply nested
function processUser(user) {
  if (user) {
    if (user.isActive) {
      return transformUser(user);
    }
  }
  return null;
}
```

### Naming Conventions

- **Variables/Functions**: camelCase, descriptive verbs for functions
- **Constants**: SCREAMING_SNAKE_CASE for true constants
- **Classes/Components**: PascalCase
- **Files**: Match export name (PascalCase for components, camelCase for utilities)
- **Boolean variables**: Use `is`, `has`, `should` prefixes

```javascript
// Good
const isLoading = true;
const hasPermission = false;
const userCount = 42;
function fetchUserData() {}

// Bad
const loading = true;
const permission = false;
const users = 42;  // Ambiguous - is it count or array?
function userData() {}  // Is this a getter or fetcher?
```

### Error Handling

- Always throw `Error` objects, never strings or other types
- Handle errors at appropriate boundaries
- Provide meaningful error messages
- Log errors with context

```javascript
// Good
throw new Error(`Failed to fetch user ${userId}: ${response.status}`);

// Bad
throw 'fetch failed';
throw { error: true };
```

### Comments

- Code should be self-documenting; avoid redundant comments
- Use comments to explain "why", not "what"
- JSDoc for public APIs and complex functions
- TODO comments should include context

```javascript
// Good - explains why
// GraphQL has a 100-item limit per query, so we batch requests
const BATCH_SIZE = 100;

// Bad - explains what (obvious from code)
// Set batch size to 100
const BATCH_SIZE = 100;
```

---

## JavaScript Best Practices

### Modern JavaScript

- ES modules (`import`/`export`) over CommonJS
- `const` by default, `let` when reassignment needed, never `var`
- Arrow functions for callbacks and short functions
- Template literals for string interpolation
- Destructuring for cleaner code
- Optional chaining (`?.`) and nullish coalescing (`??`)

```javascript
// Good
const { name, email } = user;
const displayName = user?.profile?.displayName ?? 'Anonymous';
const message = `Hello, ${name}!`;

// Bad
const name = user.name;
const email = user.email;
const displayName = user && user.profile && user.profile.displayName || 'Anonymous';
const message = 'Hello, ' + name + '!';
```

### Async/Await

- Prefer async/await over `.then()` chains
- Use `Promise.all()` for parallel operations
- Always handle promise rejections
- Avoid mixing async/await with callbacks

```javascript
// Good
async function fetchData() {
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts()
  ]);
  return { users, posts };
}

// Bad
function fetchData() {
  return fetchUsers().then(users => {
    return fetchPosts().then(posts => {
      return { users, posts };
    });
  });
}
```

### Array Methods

- Use `.map()`, `.filter()`, `.reduce()` over manual loops
- Chain methods for readability
- Avoid mutating arrays; create new ones

```javascript
// Good
const activeUserNames = users
  .filter(user => user.isActive)
  .map(user => user.name);

// Bad
const activeUserNames = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].isActive) {
    activeUserNames.push(users[i].name);
  }
}
```

---

## TypeScript Best Practices

### Type Safety

- Avoid `any`; use `unknown` and narrow types when needed
- Define interfaces for all data structures
- Use union types for constrained values
- Leverage type inference; don't over-annotate

```typescript
// Good
interface User {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

function processData(data: unknown): User {
  if (!isUser(data)) {
    throw new Error('Invalid user data');
  }
  return data;
}

// Bad
function processData(data: any): any {
  return data;
}
```

### Type Imports

- Use `import type` for type-only imports
- Keep types in dedicated files (`types.ts`)
- Export types from barrel files

```typescript
// Good
import type { User, Post } from './types';
import { fetchUser } from './api';

// Bad
import { User, Post, fetchUser } from './api';
```

### Null Handling

- Prefer `undefined` over `null` for optional values
- Use optional properties (`prop?:`) over `| undefined`
- Handle nullish values explicitly

```typescript
// Good
interface Config {
  timeout?: number;  // Optional
  retries: number;   // Required
}

// Bad
interface Config {
  timeout: number | undefined;
  retries: number;
}
```

---

## React Best Practices

### Component Design

- Prefer functional components with hooks
- Keep components small and focused
- Extract logic into custom hooks
- Use composition over prop drilling

```typescript
// Good - composed, focused
function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <UserAvatar user={user} />
      <UserInfo user={user} />
    </Card>
  );
}

// Bad - monolithic
function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <img src={user.avatar} className="..." />
      <div className="info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        {/* ... 50 more lines */}
      </div>
    </div>
  );
}
```

### Props

- Use TypeScript interfaces for props
- Destructure props in function signature
- Provide sensible defaults
- Keep prop count reasonable (< 7)

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  // ...
}
```

### Hooks

- Follow the Rules of Hooks (top level, React functions only)
- Use dependency arrays correctly in `useEffect`
- Extract complex logic into custom hooks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passed to children

```typescript
// Good
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

const handleClick = useCallback(() => {
  onSelect(item.id);
}, [item.id, onSelect]);

// Bad - recalculates on every render
const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
```

### State Management

- Keep state as local as possible
- Lift state only when needed
- Use URL state for shareable UI state (filters, pagination)
- Avoid unnecessary re-renders

```typescript
// Good - state close to where it's used
function SearchInput() {
  const [query, setQuery] = useState('');
  // ...
}

// Bad - state lifted unnecessarily
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  return <SearchInput query={searchQuery} setQuery={setSearchQuery} />;
}
```

### Event Handlers

- Name handlers with `handle` prefix
- Use `on` prefix for callback props
- Prevent default when needed
- Stop propagation intentionally

```typescript
interface ButtonProps {
  onClick: () => void;  // Callback prop with "on" prefix
}

function Form() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ...
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Next.js Best Practices

### App Router

- Use Server Components by default
- Add `"use client"` only when needed (interactivity, hooks)
- Colocate related files (page, loading, error)
- Use route groups for organization

### Data Fetching

- Fetch data in Server Components when possible
- Use `Suspense` boundaries for loading states
- Handle errors with error boundaries
- Cache and dedupe requests

### Performance

- Use `next/image` for optimized images
- Use `next/link` for client-side navigation
- Implement loading and error states
- Consider static generation for public pages

---

## Testing Best Practices

### Test Structure

- Arrange-Act-Assert pattern
- One assertion per test when practical
- Descriptive test names that explain behavior
- Test behavior, not implementation

```typescript
// Good
describe('calculateTotal', () => {
  it('returns sum of item prices', () => {
    // Arrange
    const items = [{ price: 10 }, { price: 20 }];

    // Act
    const result = calculateTotal(items);

    // Assert
    expect(result).toBe(30);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

// Bad
it('test1', () => {
  expect(calculateTotal([{ price: 10 }])).toBe(10);
  expect(calculateTotal([{ price: 10 }, { price: 20 }])).toBe(30);
  expect(calculateTotal([])).toBe(0);
});
```

### What to Test

- Critical business logic
- Edge cases and error conditions
- User interactions (clicks, input)
- Component rendering with different props

### What Not to Test

- Implementation details
- Third-party libraries
- Trivial code (simple getters/setters)

---

## Security Best Practices

- Never commit secrets (`.env`, tokens, keys)
- Validate and sanitize all external input
- Protect against path traversal in file operations
- Escape output to prevent XSS
- Use parameterized queries (no string concatenation)

---

## Development Workflow

### Before Committing

```bash
npm run pipeline        # Run ETL pipeline
npm run pipeline:dev    # Run ETL with visualizer
npm run lint            # Check linting
npm run lint:fix        # Auto-fix issues
npm test                # Run ETL tests
npm run test:unit       # Run unit tests only
npm run test:data       # Run data quality tests only
npm run test:web        # Run frontend tests
npm run test:all        # Run all tests
```

### Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code change without feature/fix
- `test:` adding/updating tests
- `chore:` maintenance tasks

---

## Frontend Development Practices

### Styling with Tailwind

- **Use Tailwind utilities exclusively** - No raw CSS for component styling
- CSS variables are defined in `globals.css` and exposed via `@theme inline`
- Use design system colors: `text-foreground`, `bg-background`, `border-border`, etc.
- For custom values, use arbitrary value syntax: `w-[4px]`, `text-[10px]`

```tsx
// Good - Tailwind utilities with design system colors
<div className="bg-card border border-border rounded-lg p-4 hover:border-border-hover">

// Bad - Raw CSS or hardcoded colors
<div style={{ backgroundColor: '#fff', border: '1px solid #e5e5e5' }}>
```

### Dark Mode Support

- Always include dark mode variants for colors
- Use semantic color names that adapt: `bg-background`, `text-foreground`
- For hardcoded colors, add `dark:` variants: `bg-white dark:bg-gray-800`
- Test both light and dark modes when making UI changes

```tsx
// Good - adapts to theme
<button className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">

// Bad - only works in light mode
<button className="bg-gray-200 text-gray-900">
```

### Design System Colors

Key CSS variables (defined in `globals.css`):
- `--background`, `--foreground` - Base page colors
- `--card`, `--card-hover` - Card backgrounds
- `--border`, `--border-hover` - Border colors
- `--accent`, `--accent-foreground` - Accent/brand color (mint green)
- `--foreground-muted`, `--foreground-secondary` - Text hierarchy

### Component Patterns

- Use `"use client"` directive only when needed (hooks, interactivity)
- Prefer composition over large monolithic components
- Use Radix UI primitives for accessible dropdowns, popovers, etc.
- Handle loading and error states explicitly

### Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Use `sm:`, `md:`, `lg:` prefixes for responsive styles
- Test at common breakpoints: 375px (mobile), 768px (tablet), 1024px+ (desktop)

---

## File Naming

| Directory | Convention | Example |
|-----------|------------|---------|
| `src/pipeline/` | `NN-step-name.js` | `01-discover.js` |
| `src/lib/` | `camelCase.js` | `cache.js` |
| `web/src/components/` | `PascalCase.tsx` | `MarketplaceCard.tsx` |
| `web/src/hooks/` | `useCamelCase.ts` | `useFetch.ts` |
| `web/src/lib/` | `camelCase.ts` | `types.ts` |
| `tests/` | `feature.test.js` | `categorizer.test.js` |
