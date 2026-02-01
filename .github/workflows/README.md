# GitHub Actions Workflows

[Back to main README](../../README.md)

This directory contains CI/CD workflows for Agent Mart.

## Workflows

### CI (`ci.yml`)

Continuous integration workflow for code quality and testing.

**Triggers:**
- Push to `main` branch
- Pull requests targeting `main`
- Manual dispatch

**Jobs:**
| Step | Description |
|------|-------------|
| Checkout | Clone repository |
| Setup Node.js | Install Node from `.nvmrc` |
| Install dependencies | `npm ci` for root and web |
| Run linting | `npm run lint` |
| Run ETL tests | `npm test` |
| Run web tests | `npm run test:web` |

**Timeout:** 10 minutes

---

### Scheduled Build (`scheduled.yml`)

Automated pipeline run for data updates and trending score calculation.

**Triggers:**
- Schedule: Every 4 hours (`0 */4 * * *`)
- Manual dispatch

**Jobs:**
| Step | Description |
|------|-------------|
| Run pipeline | Execute full ETL with visualization |
| Upload artifacts | Save `public/` and visualization report |
| Create PR | Open PR with updated data (if changes) |

**Artifacts:**
- `web-public-data` - Generated JSON output (30 day retention)
- `etl-visualization-report` - HTML progress report (30 day retention)

**Timeout:** 60 minutes

---

## Required Secrets

| Secret | Required By | Description |
|--------|-------------|-------------|
| `PIPELINE_GITHUB_TOKEN` | Nightly Build | GitHub PAT with `public_repo` scope for API access |
| `GITHUB_TOKEN` | All | Automatic token for PR creation (provided by Actions) |

### Setting Up Secrets

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add `PIPELINE_GITHUB_TOKEN` with a GitHub PAT that has `public_repo` scope

---

## Manual Triggers

All workflows support manual triggering:

1. Go to **Actions** tab
2. Select the workflow (CI or Scheduled Build)
3. Click **Run workflow**
4. Select branch and options
5. Click **Run workflow**

---

## Concurrency

Workflows use concurrency groups to prevent parallel runs:

- **CI:** `ci-${{ github.ref }}` - Cancels in-progress runs for same branch
- **Scheduled:** `scheduled-pipeline` - Only one scheduled run at a time

---

## Permissions

| Workflow | Permissions |
|----------|-------------|
| CI | `contents: read` |
| Scheduled | `contents: write`, `pull-requests: write` |
