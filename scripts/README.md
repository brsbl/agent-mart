# Build Scripts

[Back to main README](../README.md)

This directory contains build tools and the pipeline visualizer for Agent Mart.

## Scripts

### `build.js` - Pipeline Orchestrator

The main entry point for running the ETL pipeline. Executes all pipeline steps in sequence with progress callbacks.

```bash
npm run pipeline
```

**Features:**
- Runs pipeline steps 01-08 in order
- Reports timing for each step
- Handles errors gracefully
- Supports `REPO_LIMIT` environment variable for testing

### `update-categories.js` - Category Extraction

Extracts category information from pipeline output for use in CI workflows.

```bash
node scripts/update-categories.js
```

**Output:**
- Generates category taxonomy from enriched data
- Used by GitHub Actions to detect category changes

### `detect-category-changes.js` - CI Helper

Detects changes to category definitions for PR validation.

```bash
node scripts/detect-category-changes.js
```

**Used in:**
- Pull request checks
- Category consistency validation

---

## ETL Visualizer

The `etl-visualizer/` directory contains tools for real-time pipeline monitoring.

### Using the Visualizer

For local development, use the visualizer to monitor pipeline progress in real-time:

```bash
npm run pipeline:dev
```

This opens a browser with a live-updating HTML report showing:
- Stage progress with timing
- Metrics before/after each stage
- Validation errors
- Data previews

The report is saved to `scripts/etl-visualizer/output/pipeline-status.html`.

### Visualizer Components

| File | Description |
|------|-------------|
| `run.js` | Runs pipeline with visualization callbacks |
| `md-to-html.js` | Converts markdown reports to HTML |
| `output/` | Generated HTML reports |

### Example Output

```
┌─────────────────────────────────────────┐
│ Stage: 02-fetch-repos                   │
│ Status: Complete                        │
│ Duration: 2.3s                          │
│ Repos fetched: 45                       │
│ Cache hits: 12                          │
└─────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Required for pipeline execution |
| `REPO_LIMIT` | Limit repos for testing (e.g., `REPO_LIMIT=3`) |
