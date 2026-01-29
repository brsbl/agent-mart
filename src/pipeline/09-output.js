import { saveJson, loadJson, ensureDir, log, logError, sanitizeFilename } from '../lib/utils.js';
import { loadSignalsHistory } from '../lib/signalsHistory.js';
import { calculateTrendingScore } from '../lib/trending.js';

const INPUT_PATH = './data/06-enriched.json';
const CATEGORIZED_PATH = './data/marketplaces-categorized.json';
const CATEGORY_STATS_PATH = './data/category-stats.json';
const INDEX_PATH = './web/public/data/index.json';
const AUTHORS_DIR = './web/public/data/authors';
const PLUGINS_BROWSE_PATH = './web/public/data/plugins-browse.json';
const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';
const CATEGORIES_PATH = './web/public/data/categories.json';

/**
 * Generate final public JSON files
 */
export function output({ onProgress: _onProgress } = {}) {
  log('Generating public JSON files...');

  const { authors } = loadJson(INPUT_PATH);
  ensureDir(AUTHORS_DIR);

  // Load categorized data if available
  const categorizedMap = new Map();
  let categoryStats = null;
  try {
    const categorized = loadJson(CATEGORIZED_PATH);
    for (const m of categorized) {
      categorizedMap.set(m.repo_full_name, m);
    }
    categoryStats = loadJson(CATEGORY_STATS_PATH);
    log(`Loaded ${categorized.length} categorized marketplaces`);
  } catch {
    log('Warning: Categorized data not found. Run 08-aggregate.js first.');
  }

  // Load signals history for trending calculation
  const signalsHistory = loadSignalsHistory();
  const hasHistory = signalsHistory.meta.snapshot_count > 0;
  if (hasHistory) {
    log(`Loaded signals history with ${signalsHistory.meta.snapshot_count} snapshots`);
  } else {
    log('No signals history available, trending scores will be 0');
  }

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
      marketplaces: [...author.marketplaces].sort((a, b) => (b.signals?.stars || 0) - (a.signals?.stars || 0))
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
          categories: plugin.categories || [],
          author_id: author.id,
          author_display_name: author.display_name,
          author_avatar_url: author.avatar_url,
          marketplace_name: marketplace.name,
          repo_full_name: marketplace.repo_full_name,
          install_commands: plugin.install_commands || [],
          signals: {
            stars: marketplace.signals?.stars || 0,
            pushed_at: marketplace.signals?.pushed_at || null
          },
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
      const catData = categorizedMap.get(marketplace.repo_full_name);

      // Use flat category array from categorizer
      const categories = catData?.categories || [];

      // Calculate trending score from history
      const repoHistory = signalsHistory.repositories[marketplace.repo_full_name];
      const currentStars = marketplace.signals?.stars || 0;
      const trendingData = calculateTrendingScore(repoHistory, currentStars);

      marketplacesBrowse.push({
        name: marketplace.name,
        description: marketplace.description || null,
        author_id: author.id,
        author_display_name: author.display_name,
        author_avatar_url: author.avatar_url,
        repo_full_name: marketplace.repo_full_name,
        signals: {
          stars: currentStars,
          forks: marketplace.signals?.forks || 0,
          pushed_at: marketplace.signals?.pushed_at || null,
          trending_score: trendingData.trending_score,
          stars_gained_7d: trendingData.stars_gained_7d,
          stars_velocity: trendingData.stars_velocity
        },
        plugins_count: marketplace.plugins?.length || 0,
        first_plugin_name: firstPlugin?.name || null,
        keywords: marketplace.keywords || [],
        categories
      });
    }
  }
  marketplacesBrowse.sort((a, b) => {
    const timeA = a.signals.pushed_at ? new Date(a.signals.pushed_at).getTime() : 0;
    const timeB = b.signals.pushed_at ? new Date(b.signals.pushed_at).getTime() : 0;
    // Handle invalid dates (NaN) by treating them as 0
    const dateA = Number.isNaN(timeA) ? 0 : timeA;
    const dateB = Number.isNaN(timeB) ? 0 : timeB;
    return dateB - dateA;
  });
  saveJson(MARKETPLACES_BROWSE_PATH, { meta, marketplaces: marketplacesBrowse });
  log(`Generated ${MARKETPLACES_BROWSE_PATH} (${marketplacesBrowse.length} marketplaces)`);

  // Generate categories.json with dynamic category list from actual data
  // Build category list explicitly sorted by count (most used first)
  const allCategories = categoryStats?.categoryCounts
    ? Object.entries(categoryStats.categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat)
    : [];

  const categoriesData = {
    meta: {
      ...meta,
      stats: categoryStats
    },
    // List of all categories sorted by usage count
    categories: allCategories,
    // Counts for reference
    counts: categoryStats?.categoryCounts || {}
  };
  saveJson(CATEGORIES_PATH, categoriesData);
  log(`Generated ${CATEGORIES_PATH} (${allCategories.length} categories)`);

  // Summary
  log('');
  log('=== Output Summary ===');
  log(`Authors: ${authorSummaries.length}`);
  log(`Marketplaces: ${totals.marketplaces}`);
  log(`Plugins: ${totals.plugins}`);
  log(`Commands: ${totals.commands}`);
  log(`Skills: ${totals.skills}`);
  log(`Categories: ${allCategories.length}`);

  return indexData;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    output();
  } catch (error) {
    logError('Output error', error);
  }
}
