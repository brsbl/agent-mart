# Claude Code Resource Directory – Comprehensive Plan

## 1. Goal & Non‑Goals

### Goal

Build a **public, read‑only reference directory** for Claude Code resources that lets users:

* Discover **who** is building things (GitHub owners)
* See **what** they publish (marketplaces → plugins → commands/skills)
* Copy/paste **official install commands** to install resources *wherever they choose*

The directory is **not an installer**, **not an opinionated workflow manager**, and **not scope‑aware**. It is a reference + discovery surface only.

### Explicit Non‑Goals

* Do **not** model Claude installation scope (user vs project)
* Do **not** enforce precedence or resolution rules
* Do **not** invent new packaging abstractions (no bundles)
* Do **not** attempt to run or validate plugins/skills

---

## 2. Canonical Mental Model (Aligned with Anthropic)

* **Marketplace** = a catalog of plugins (defined by `.claude-plugin/marketplace.json`)
* **Plugin** = the atomic *workflow package*

  * Installable
  * Ships slash commands, skills, hooks, MCP servers, docs
* **Slash commands** = explicit, user‑invoked commands (defined in `commands/*.md`)
* **Skills** = model‑invoked capabilities (defined by `SKILL.md`)

**Key decision:**

> The directory is **marketplace‑first**. Everything else is derived from marketplaces.

This matches how Claude Code users actually install and share workflows.

---

## 3. High‑Level Architecture

### Crawl & Index Pipeline

1. Discover marketplace repos on GitHub
2. Fetch repo + owner metadata (social proof)
3. Parse `marketplace.json`
4. Enrich every plugin listed
5. Normalize everything into an owner‑centric model
6. Emit static JSON artifacts for a website

### Output Artifacts

* `public/index.json` – owners list + summary cards
* `public/owners/<owner>.json` – full data for one owner

No database required. Static hosting only.

---

## 4. Discovery Strategy (Source of Truth)

### Primary Discovery (Required)

GitHub code search:

```
path:.claude-plugin filename:marketplace.json
```

Only repos matching this are indexed in v1.

### Why marketplace.json is the spine

* Canonical list of installables
* Stable install commands
* Explicit plugin boundaries
* Lowest ambiguity / lowest spam risk

---

## 5. Data Model (Simple, Stable, Marketplace‑Derived)

### Owner

Fetched from GitHub API (`GET /users/{owner}`)

```json
{
  "id": "anthropics",
  "display_name": "Anthropic",
  "type": "Organization",
  "avatar_url": "https://…",
  "url": "https://github.com/anthropics"
}
```

### Repo (Marketplace Repo)

```json
{
  "repo": "anthropics/skills",
  "url": "https://github.com/anthropics/skills",
  "signals": {
    "stars": 1234,
    "forks": 210,
    "pushed_at": "…",
    "license": "MIT"
  }
}
```

### Marketplace

Parsed from `.claude-plugin/marketplace.json`

```json
{
  "id": "skills",
  "install_commands": ["/plugin marketplace add anthropics/skills"],
  "plugins": [ … ]
}
```

### Plugin (Workflow Unit)

```json
{
  "name": "document-skills",
  "description": "…",
  "source": "./document-skills",
  "install_commands": [
    "/plugin marketplace add anthropics/skills",
    "/plugin install document-skills@skills"
  ],
  "signals": { "stars": 1234, "forks": 210 },
  "commands": [ … ],
  "skills": [ … ]
}
```

### Slash Command

```json
{
  "name": "/summarize",
  "description": "Summarize a document",
  "path": "document-skills/commands/summarize.md"
}
```

### Skill

```json
{
  "name": "Document Reviewer",
  "description": "Review documents for issues",
  "path": "document-skills/skills/reviewer/SKILL.md"
}
```

---

## 6. Plugin Enrichment (Required)

For **every plugin entry** listed in `marketplace.json`:

### Files to Parse

* `${source}/.claude-plugin/plugin.json` (if present)
* `${source}/commands/*.md`
* `${source}/**/SKILL.md` (bounded search)

### Rules

* Traversal is **bounded** (max depth, max files)
* Missing files are allowed
* Plugin metadata may override marketplace description

### Why enrichment matters

* Makes the directory *browsable*, not just installable
* Users can preview what commands/skills they get
* Enables search by command/skill name

---

## 7. Social Proof (Critical)

### Repo‑Level Signals (Authoritative)

From `GET /repos/{owner}/{repo}`:

* `stargazers_count`
* `forks_count`
* `pushed_at`
* `license.spdx_id`

### Inheritance Model

* Plugins inherit repo signals
* Commands & skills inherit plugin → repo signals

### Usage

* Display on cards
* Sort by popularity
* Reduce spam / low‑quality noise

---

## 8. Owner‑Centric Organization (Core UX)

Everything is grouped by **GitHub owner**.

### Navigation Hierarchy

```
Owner
 └─ Repo (marketplace)
     └─ Marketplace
         └─ Plugin (workflow)
             ├─ Slash commands
             └─ Skills
```

### Why this matters

* Users follow *people*, not abstractions
* Easy sharing: "check out everything this person built"
* Natural social proof aggregation

---

## 9. Install UX (Directory Is Scope‑Agnostic)

The directory only shows **copy/paste commands**.

### Marketplace

```
/plugin marketplace add owner/repo
```

### Plugin

```
/plugin marketplace add owner/repo
/plugin install plugin@marketplace
```

Where the user installs (user vs project) is **their decision**, not the directory's.

---

## 10. JSON Outputs

### `public/index.json`

* List of owners
* Owner metadata + avatar
* Counts (repos, plugins, commands, skills)
* Aggregated social proof

### `public/owners/<owner>.json`

* Owner metadata
* All marketplace repos
* Fully enriched plugins

These files fully power the website.

---

## 11. Ranking & Sorting

Default ordering:

1. Stars (desc)
2. Forks (desc)
3. Last pushed date (desc)

Applies to:

* Owners
* Repos
* Plugins

---

## 12. Implementation Notes

* Language: Python or Node (Python already prototyped)
* Run via GitHub Actions nightly
* Cache API calls per run
* Fail soft on missing files
* No authentication required to browse

---

## 13. Explicit v1 Scope

### Included

* Marketplace discovery
* Plugin enrichment
* Commands & skills preview
* Owner avatars + names
* Stars/forks social proof

### Excluded (Future)

* Standalone skill repos
* Standalone command repos
* Editorial curation
* User accounts or logins
* Ratings or reviews

---

## 14. Success Criteria

The project is successful if:

* A user can discover a creator
* See what workflows they ship
* Copy a plugin install command
* Install it into Claude Code

No more. No less.
