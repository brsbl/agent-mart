import { saveJson, loadJson, ensureDir, log, sanitizeFilename } from '../lib/utils.js';

const INPUT_PATH = './data/06-enriched.json';
const INDEX_PATH = './web/public/data/index.json';
const OWNERS_DIR = './web/public/data/owners';
const PLUGINS_BROWSE_PATH = './web/public/data/plugins-browse.json';

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

  // Build shared meta object
  const meta = {
    total_owners: ownerSummaries.length,
    total_repos: totals.repos,
    total_plugins: totals.plugins,
    total_commands: totals.commands,
    total_skills: totals.skills,
    generated_at: new Date().toISOString()
  };

  // Write index.json
  const indexData = {
    meta,
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
      repos: owner.repos.sort((a, b) => (b.signals?.stars || 0) - (a.signals?.stars || 0))
    };

    const ownerPath = `${OWNERS_DIR}/${sanitizeFilename(owner.id)}.json`;
    saveJson(ownerPath, ownerData);
  }

  log(`Generated ${Object.keys(owners).length} owner files in ${OWNERS_DIR}/`);

  // Generate lightweight plugins array for browse/search
  const pluginsBrowse = [];
  for (const owner of Object.values(owners)) {
    for (const repo of owner.repos) {
      const plugins = repo.marketplace?.plugins || [];
      for (const plugin of plugins) {
        pluginsBrowse.push({
          name: plugin.name,
          description: plugin.description,
          category: plugin.category,
          owner_id: owner.id,
          owner_display_name: owner.display_name,
          owner_avatar_url: owner.avatar_url,
          repo_full_name: repo.full_name,
          install_commands: plugin.install_commands || [],
          signals: {
            stars: plugin.signals?.stars || 0,
            pushed_at: plugin.signals?.pushed_at || null
          },
          commands_count: plugin.commands?.length || 0,
          skills_count: plugin.skills?.length || 0
        });
      }
    }
  }

  // Sort by stars (descending) for default ordering
  pluginsBrowse.sort((a, b) => (b.signals?.stars || 0) - (a.signals?.stars || 0));

  const pluginsBrowseData = {
    meta,
    plugins: pluginsBrowse
  };

  saveJson(PLUGINS_BROWSE_PATH, pluginsBrowseData);
  log(`Generated ${PLUGINS_BROWSE_PATH} (${pluginsBrowse.length} plugins)`);

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
  try {
    output();
  } catch (error) {
    console.error(error);
  }
}
