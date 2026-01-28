# Visual Verification Test Flows

This document specifies the visual verification flows for the Agent Mart web frontend.
These tests are designed to be run with dev-browser for screenshot validation.

## Prerequisites

1. Start the Next.js dev server: `cd web && npm run dev`
2. Dev server runs at `http://localhost:3000`

---

## Flow 1: Homepage Verification

**Route:** `/`

### Test Cases

#### 1.1 MarketplaceCard Rendering
- **Action:** Navigate to homepage
- **Expected:**
  - [ ] MarketplaceCard components render with name, author, and description
  - [ ] Each card shows category badges (CategoryPill)
  - [ ] Cards are clickable and show hover state
  - [ ] Cards display star count if available

#### 1.2 SortDropdown Functionality
- **Action:** Click on sort dropdown
- **Expected:**
  - [ ] Dropdown opens showing sorting options
  - [ ] Options include: "Most Popular", "Recently Updated", "A-Z"
  - [ ] Selected option shows checkmark indicator

#### 1.3 Category Pills
- **Action:** Observe category badges on cards
- **Expected:**
  - [ ] CategoryPill components display category names
  - [ ] Styling differentiates categories (colors/icons)
  - [ ] Pills are visually distinct and readable

#### 1.4 Pagination/Infinite Scroll
- **Action:** Scroll to bottom of page
- **Expected:**
  - [ ] "Load More" button appears or infinite scroll triggers
  - [ ] Additional marketplace cards load
  - [ ] No duplicate cards appear

---

## Flow 2: Author Page Verification

**Route:** `/[author]`

### Test Cases

#### 2.1 Author Marketplace Listing
- **Action:** Navigate to an author page (e.g., `/anthropic`)
- **Expected:**
  - [ ] Author name displayed prominently
  - [ ] All marketplaces by author are listed
  - [ ] MarketplaceCard format is consistent with homepage

---

## Flow 3: Marketplace Detail Verification

**Route:** `/[author]/[marketplace]`

### Test Cases

#### 3.1 Header Information
- **Action:** Navigate to marketplace detail page
- **Expected:**
  - [ ] Marketplace name displayed
  - [ ] Author name/link displayed
  - [ ] Description text visible
  - [ ] Category badges shown

#### 3.2 CopyableCommand Component
- **Action:** Observe install command section
- **Expected:**
  - [ ] Command text displayed in monospace font
  - [ ] Copy button visible next to command
  - [ ] Format: `claude mcp add <author>/<marketplace>`

#### 3.3 CopyableCommand Interaction
- **Action:** Click copy button
- **Expected:**
  - [ ] Visual feedback shows "Copied!" state
  - [ ] State resets after 2 seconds
  - [ ] Command text copied to clipboard

#### 3.4 FileTree Component
- **Action:** Observe file tree section
- **Expected:**
  - [ ] File/folder hierarchy displayed
  - [ ] Folders show expand/collapse indicators
  - [ ] File icons differentiate file types
  - [ ] Indentation reflects nesting level

#### 3.5 PluginSection Display
- **Action:** Scroll to plugins section
- **Expected:**
  - [ ] Each plugin listed with name and description
  - [ ] Skills shown under relevant plugin
  - [ ] Commands shown under relevant plugin
  - [ ] Expandable sections work correctly

---

## Flow 4: Error States

### Test Cases

#### 4.1 404 Page
- **Action:** Navigate to invalid URL (e.g., `/invalid-author/invalid-marketplace`)
- **Expected:**
  - [ ] 404 page displays
  - [ ] User-friendly error message shown
  - [ ] Navigation options available

#### 4.2 Loading States
- **Action:** Navigate with network throttling
- **Expected:**
  - [ ] Loading indicators shown during data fetch
  - [ ] Skeleton loaders or spinners visible
  - [ ] Page doesn't flash unstyled content

---

## Flow 5: Responsive Design

### Test Cases

#### 5.1 Mobile Viewport (375px)
- **Action:** Set viewport to mobile width
- **Expected:**
  - [ ] Layout adapts to single column
  - [ ] Navigation collapses or adapts
  - [ ] Cards stack vertically
  - [ ] All interactive elements remain usable

#### 5.2 Tablet Viewport (768px)
- **Action:** Set viewport to tablet width
- **Expected:**
  - [ ] Layout shows 2-column grid
  - [ ] Spacing adjusts appropriately

#### 5.3 Desktop Viewport (1280px)
- **Action:** Set viewport to desktop width
- **Expected:**
  - [ ] Full multi-column layout
  - [ ] Maximum content width enforced
  - [ ] Sidebar/navigation fully visible

---

## Screenshot Checkpoints

| Checkpoint | Route | Viewport | Description |
|------------|-------|----------|-------------|
| home-desktop | `/` | 1280x800 | Homepage full view |
| home-mobile | `/` | 375x667 | Homepage mobile view |
| home-sort-open | `/` | 1280x800 | Sort dropdown expanded |
| detail-desktop | `/anthropic/example` | 1280x800 | Marketplace detail full view |
| detail-copy-feedback | `/anthropic/example` | 1280x800 | After clicking copy button |
| detail-plugin-expanded | `/anthropic/example` | 1280x800 | Plugin section expanded |
| error-404 | `/invalid/path` | 1280x800 | 404 error page |

---

## Running Visual Tests

### Manual Verification
```bash
# Start dev server
cd web && npm run dev

# Open in browser and walk through each flow
open http://localhost:3000
```

### With dev-browser Skill
When dev-browser is available, these flows can be automated:

```
/dev-browser navigate to http://localhost:3000
/dev-browser screenshot home-desktop.png
/dev-browser click on [sort dropdown]
/dev-browser screenshot home-sort-open.png
```

---

## Test Results Template

```markdown
## Visual Test Results - [DATE]

### Flow 1: Homepage
- [ ] 1.1 MarketplaceCard: PASS/FAIL
- [ ] 1.2 SortDropdown: PASS/FAIL
- [ ] 1.3 CategoryPills: PASS/FAIL
- [ ] 1.4 Pagination: PASS/FAIL

### Flow 2: Author Page
- [ ] 2.1 Author Listing: PASS/FAIL

### Flow 3: Marketplace Detail
- [ ] 3.1 Header: PASS/FAIL
- [ ] 3.2 CopyableCommand Display: PASS/FAIL
- [ ] 3.3 CopyableCommand Interaction: PASS/FAIL
- [ ] 3.4 FileTree: PASS/FAIL
- [ ] 3.5 PluginSection: PASS/FAIL

### Flow 4: Error States
- [ ] 4.1 404 Page: PASS/FAIL
- [ ] 4.2 Loading States: PASS/FAIL

### Flow 5: Responsive
- [ ] 5.1 Mobile: PASS/FAIL
- [ ] 5.2 Tablet: PASS/FAIL
- [ ] 5.3 Desktop: PASS/FAIL

### Screenshots Captured
- [ ] home-desktop.png
- [ ] home-mobile.png
- [ ] home-sort-open.png
- [ ] detail-desktop.png
- [ ] detail-copy-feedback.png
- [ ] detail-plugin-expanded.png
- [ ] error-404.png

### Notes
[Any observations, issues, or follow-up items]
```
