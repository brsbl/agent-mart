/**
 * Seed discovery data when the CI cache is cold.
 *
 * Uses two committed sources (in priority order):
 * 1. data/01-discovered.json — the full discovery list from the last pipeline run
 * 2. web/public/data/marketplaces-browse.json — the browse output (subset of discovered)
 *
 * By seeding from discovered.json first, we avoid the feedback loop where
 * repos dropped from browse output are permanently lost.
 */
import fs from 'node:fs';

const DISCOVERED_PATH = 'data/01-discovered.json';
const BROWSE_PATH = 'web/public/data/marketplaces-browse.json';
const OUTPUT_PATH = 'data/01-discovered.json';

const repos = new Map();

// Primary source: committed discovered.json (has the full set)
try {
  const discovered = JSON.parse(fs.readFileSync(DISCOVERED_PATH, 'utf8'));
  for (const r of discovered.repos) {
    repos.set(r.full_name, r);
  }
  console.log(`Loaded ${repos.size} repos from committed discovered.json`);
} catch {
  console.log('No committed discovered.json found');
}

// Secondary source: browse data (catches any new repos added outside the pipeline)
try {
  const browse = JSON.parse(fs.readFileSync(BROWSE_PATH, 'utf8'));
  let added = 0;
  for (const m of browse.marketplaces) {
    if (!repos.has(m.repo_full_name)) {
      const [owner, repo] = m.repo_full_name.split('/');
      repos.set(m.repo_full_name, {
        owner,
        repo,
        full_name: m.repo_full_name,
        marketplace_path: '.claude-plugin/marketplace.json',
      });
      added++;
    }
  }
  if (added > 0) {
    console.log(`Added ${added} repos from browse data`);
  }
} catch {
  console.log('No browse data found');
}

if (repos.size === 0) {
  console.log('Warning: No seed data found. Discovery will start from scratch.');
}

fs.mkdirSync('data', { recursive: true });

const output = {
  discovered_at: new Date().toISOString(),
  total: repos.size,
  repos: [...repos.values()],
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`Seeded discovery with ${repos.size} repos`);
