---
id: codebase-convention-review-8f2a
name: Codebase Convention Review and Fixes
status: approved
created: 2026-01-28
updated: 2026-01-28
---

# Codebase Convention Review and Fixes

## Overview

Review and fix code that doesn't meet the conventions defined in CLAUDE.md. The codebase was comprehensively explored and ~15 specific violations were identified across JavaScript (ETL pipeline) and TypeScript (web frontend) code.

### Problem

The codebase has inconsistent patterns that don't align with the documented best practices in CLAUDE.md:
- Inconsistent error handling (mixing `console.error` with `logError()` utility)
- Code duplication (duplicate utility functions)
- Inconsistent logging (mixing `console.log` with `log()` utility)
- Missing modern JavaScript operators (`??` vs `||`)
- Minor TypeScript naming inconsistencies

### Solution

Fix all identified violations to ensure codebase consistency with CLAUDE.md conventions.

---

## Goals

- Fix all high-priority error handling inconsistencies
- Remove code duplication
- Standardize logging across pipeline files
- Update to modern JavaScript operators where appropriate
- Fix minor TypeScript naming issues

## Non-Goals

- Refactoring working code that follows conventions
- Adding new features
- Changing architectural patterns
- Full line-by-line review (violations already identified)

---

## User Stories

1. **As a developer**, I want consistent error handling across all pipeline files so that errors are logged uniformly with timestamps and context.

2. **As a developer**, I want no duplicate utility functions so that maintenance is easier and behavior is consistent.

3. **As a developer**, I want modern JavaScript operators used consistently so that the code follows current best practices.

---

## Technical Design

### Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| P1 | `src/pipeline/08-categorize.js` | Remove duplicate loadJSON, replace console.log/error with utilities |
| P1 | `src/pipeline/02-fetch-repos.js` | Replace `.catch(console.error)` with `logError()` |
| P1 | `src/pipeline/03-fetch-trees.js` | Replace `.catch(console.error)` with `logError()` |
| P1 | `src/pipeline/04-fetch-files.js` | Replace `.catch(console.error)` with `logError()` |
| P1 | `src/pipeline/06-enrich.js` | Replace `console.error(error)` with `logError()` |
| P1 | `src/pipeline/07-output.js` | Replace `console.error(error)` with `logError()` |
| P2 | `scripts/detect-category-changes.js` | Replace console.log/error with utilities |
| P2 | `src/lib/github.js` | Use `??` instead of `||`, template literal |
| P3 | `web/src/components/SearchFilterControls.tsx` | Rename `open` to `isOpen` |
| P3 | `web/src/app/[author]/[marketplace]/page.tsx` | Simplify type signature |

### Detailed Changes

#### Priority 1: Error Handling Consistency

**Pattern to fix:**
```javascript
// Before
.catch(console.error)
console.error(error)

// After
.catch(err => logError('Context message', err))
logError('Context message', error)
```

**Files:**
- `02-fetch-repos.js:91` - Add import for `logError`, fix catch
- `03-fetch-trees.js:107` - Add import for `logError`, fix catch
- `04-fetch-files.js:238` - Add import for `logError`, fix catch
- `06-enrich.js:218` - Fix direct console.error call
- `07-output.js:214` - Fix direct console.error call
- `08-categorize.js:112` - Fix catch pattern

#### Priority 1: Code Duplication

**File:** `src/pipeline/08-categorize.js`

Remove lines 6-13 (duplicate `loadJSON` function) and:
1. Import `loadJson` from `../lib/utils.js`
2. Replace async `loadJSON()` calls with sync `loadJson()`
3. Replace `console.log()` with `log()` throughout
4. Replace `console.error()` with `logError()`

#### Priority 2: Modern JavaScript Operators

**File:** `src/lib/github.js:302-320`

```javascript
// Before
language: repoData.primaryLanguage?.name || null,
followers: owner.followers?.totalCount || 0

// After
language: repoData.primaryLanguage?.name ?? null,
followers: owner.followers?.totalCount ?? 0
```

**File:** `src/lib/github.js:55-59`

Convert string concatenation to template literal.

#### Priority 3: TypeScript Naming

**File:** `web/src/components/SearchFilterControls.tsx:29`
```typescript
// Before
const [open, setOpen] = useState(false);
// After
const [isOpen, setIsOpen] = useState(false);
```

**File:** `web/src/app/[author]/[marketplace]/page.tsx:37`
```typescript
// Before
function formatRelativeTime(dateString: string | null | undefined)
// After
function formatRelativeTime(dateString?: string | null)
```

---

## Implementation Plan

### Phase 1: High Priority (~8 files)
1. Fix `08-categorize.js` (most changes)
2. Fix error handling in `02-fetch-repos.js`
3. Fix error handling in `03-fetch-trees.js`
4. Fix error handling in `04-fetch-files.js`
5. Fix error handling in `06-enrich.js`
6. Fix error handling in `07-output.js`

### Phase 2: Medium Priority (~2 files)
7. Fix `scripts/detect-category-changes.js`
8. Fix `src/lib/github.js`

### Phase 3: Low Priority (~2 files)
9. Fix `SearchFilterControls.tsx`
10. Fix `[author]/[marketplace]/page.tsx`

---

## Verification

1. `npm run lint` - No linting errors
2. `npm test` - All ETL tests pass (124 tests)
3. `npm run test:web` - All frontend tests pass (29 tests)
4. Manual verification of changed files

---

## Open Questions

None - all violations are clearly defined with specific fixes.
