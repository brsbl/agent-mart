import { saveJson, loadJson, ensureDir, log, sanitizeFilename } from '../lib/utils.js';

const INPUT_PATH = './data/06-enriched.json';
const INDEX_PATH = './web/public/data/index.json';
const AUTHORS_DIR = './web/public/data/authors';
const PLUGINS_BROWSE_PATH = './web/public/data/plugins-browse.json';
const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';

/**
 * Generate final public JSON files
 */
export function output() {
  log('Generating public JSON files...');

  const { authors } = loadJson(INPUT_PATH);
  ensureDir(AUTHORS_DIR);

  // Build author summaries for index (sorted by stars)
  const authorSummaries = Object.values(authors)
    .map(author => ({
      id: author.id,
      display_name: author.display_name,
      type: author.type,
      avatar_url: author.avatar_url,
      url: author.url,
      stats: author.stats
    }))
    .sort((a, b) => b.stats.total_stars - a.stats.total_stars);

  // Calculate totals
  const totals = authorSummaries.reduce(
    (acc, a) => ({
      marketplaces: acc.marketplaces + a.stats.total_marketplaces,
      plugins: acc.plugins + a.stats.total_plugins,
      commands: acc.commands + a.stats.total_commands,
      skills: acc.skills + a.stats.total_skills
    }),
    { marketplaces: 0, plugins: 0, commands: 0, skills: 0 }
  );

  // Build shared meta object
  const meta = {
    total_authors: authorSummaries.length,
    total_marketplaces: totals.marketplaces,
    total_plugins: totals.plugins,
    total_commands: totals.commands,
    total_skills: totals.skills,
    generated_at: new Date().toISOString()
  };

  // Write index.json
  const indexData = {
    meta,
    authors: authorSummaries
  };

  saveJson(INDEX_PATH, indexData);
  log(`Generated ${INDEX_PATH}`);

  // Write per-author files
  for (const author of Object.values(authors)) {
    const authorData = {
      author: {
        id: author.id,
        display_name: author.display_name,
        type: author.type,
        avatar_url: author.avatar_url,
        url: author.url,
        bio: author.bio,
        stats: author.stats
      },
      marketplaces: author.marketplaces.sort((a, b) => (b.signals?.stars || 0) - (a.signals?.stars || 0))
    };

    const authorPath = `${AUTHORS_DIR}/${sanitizeFilename(author.id)}.json`;
    saveJson(authorPath, authorData);
  }

  log(`Generated ${Object.keys(authors).length} author files in ${AUTHORS_DIR}/`);

  // Generate lightweight plugins array for browse/search
  const pluginsBrowse = [];
  for (const author of Object.values(authors)) {
    for (const marketplace of author.marketplaces) {
      const plugins = marketplace.plugins || [];
      for (const plugin of plugins) {
        pluginsBrowse.push({
          name: plugin.name,
          description: plugin.description,
          category: plugin.category,
          author_id: author.id,
          author_display_name: author.display_name,
          author_avatar_url: author.avatar_url,
          marketplace_name: marketplace.name,
          repo_full_name: marketplace.repo_full_name,
          install_commands: plugin.install_commands || [],
          signals: {
            stars: plugin.signals?.stars || 0,
            pushed_at: plugin.signals?.pushed_at || null
          },
          commands_count: plugin.commands?.length || 0,
          skills_count: plugin.skills?.length || 0,
          keywords: marketplace.keywords || []
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

  // Generate marketplaces browse array (sorted by pushed_at, most recent first)
  const marketplacesBrowse = [];
  for (const author of Object.values(authors)) {
    for (const marketplace of author.marketplaces) {
      const firstPlugin = marketplace.plugins?.[0];
      marketplacesBrowse.push({
        name: marketplace.name,
        description: marketplace.description || null,
        author_id: author.id,
        author_display_name: author.display_name,
        author_avatar_url: author.avatar_url,
        repo_full_name: marketplace.repo_full_name,
        signals: {
          stars: marketplace.signals?.stars || 0,
          forks: marketplace.signals?.forks || 0,
          pushed_at: marketplace.signals?.pushed_at || null
        },
        plugins_count: marketplace.plugins?.length || 0,
        first_plugin_name: firstPlugin?.name || null,
        keywords: marketplace.keywords || [],
        categories: marketplace.categories || []
      });
    }
  }
  marketplacesBrowse.sort((a, b) => {
    const dateA = a.signals.pushed_at ? new Date(a.signals.pushed_at).getTime() : 0;
    const dateB = b.signals.pushed_at ? new Date(b.signals.pushed_at).getTime() : 0;
    return dateB - dateA;
  });
  saveJson(MARKETPLACES_BROWSE_PATH, { meta, marketplaces: marketplacesBrowse });
  log(`Generated ${MARKETPLACES_BROWSE_PATH} (${marketplacesBrowse.length} marketplaces)`);

  // Summary
  log('');
  log('=== Output Summary ===');
  log(`Authors: ${authorSummaries.length}`);
  log(`Marketplaces: ${totals.marketplaces}`);
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
