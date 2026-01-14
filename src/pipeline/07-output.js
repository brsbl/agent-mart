import { saveJson, loadJson, ensureDir, log, sanitizeFilename } from '../lib/utils.js';

const INPUT_PATH = './data/06-enriched.json';
const INDEX_PATH = './public/index.json';
const OWNERS_DIR = './public/owners';

/**
 * Generate final public JSON files
 */
export function output() {
  log('Generating public JSON files...');

  const { owners } = loadJson(INPUT_PATH);
  ensureDir(OWNERS_DIR);

  // Build owner summaries for index (sorted by stars)
  const ownerSummaries = Object.values(owners)
    .map(owner => ({
      id: owner.id,
      display_name: owner.display_name,
      type: owner.type,
      avatar_url: owner.avatar_url,
      url: owner.url,
      stats: owner.stats
    }))
    .sort((a, b) => b.stats.total_stars - a.stats.total_stars);

  // Calculate totals
  const totals = ownerSummaries.reduce(
    (acc, o) => ({
      repos: acc.repos + o.stats.total_repos,
      plugins: acc.plugins + o.stats.total_plugins,
      commands: acc.commands + o.stats.total_commands,
      skills: acc.skills + o.stats.total_skills
    }),
    { repos: 0, plugins: 0, commands: 0, skills: 0 }
  );

  // Write index.json
  const indexData = {
    meta: {
      total_owners: ownerSummaries.length,
      total_repos: totals.repos,
      total_plugins: totals.plugins,
      total_commands: totals.commands,
      total_skills: totals.skills,
      generated_at: new Date().toISOString()
    },
    owners: ownerSummaries
  };

  saveJson(INDEX_PATH, indexData);
  log(`Generated ${INDEX_PATH}`);

  // Write per-owner files
  for (const owner of Object.values(owners)) {
    const ownerData = {
      owner: {
        id: owner.id,
        display_name: owner.display_name,
        type: owner.type,
        avatar_url: owner.avatar_url,
        url: owner.url,
        bio: owner.bio,
        stats: owner.stats
      },
      repos: owner.repos.sort((a, b) => b.signals.stars - a.signals.stars)
    };

    const ownerPath = `${OWNERS_DIR}/${sanitizeFilename(owner.id)}.json`;
    saveJson(ownerPath, ownerData);
  }

  log(`Generated ${Object.keys(owners).length} owner files in ${OWNERS_DIR}/`);

  // Summary
  log('');
  log('=== Output Summary ===');
  log(`Owners: ${ownerSummaries.length}`);
  log(`Repos: ${totals.repos}`);
  log(`Plugins: ${totals.plugins}`);
  log(`Commands: ${totals.commands}`);
  log(`Skills: ${totals.skills}`);

  return indexData;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  output().catch(console.error);
}
