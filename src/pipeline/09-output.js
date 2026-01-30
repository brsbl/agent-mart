import { saveJson, loadJson, ensureDir, log, logError, sanitizeFilename } from '../lib/utils.js';
import { loadSignalsHistory } from '../lib/signalsHistory.js';
import { calculateTrendingScore } from '../lib/trending.js';

const INPUT_PATH = './data/06-enriched.json';
const CATEGORIZED_PATH = './data/marketplaces-categorized.json';
const AUTHORS_DIR = './web/public/data/authors';
const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';

/**
 * Generate final public JSON files
 */
export function output({ onProgress: _onProgress } = {}) {
  log('Generating public JSON files...');

  const { authors } = loadJson(INPUT_PATH);
  ensureDir(AUTHORS_DIR);

  // Load categorized data if available
  const categorizedMap = new Map();
  try {
    const categorized = loadJson(CATEGORIZED_PATH);
    for (const m of categorized) {
      categorizedMap.set(m.repo_full_name, m);
    }
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

  // Calculate totals for summary
  const authorsList = Object.values(authors);
  const totals = authorsList.reduce(
    (acc, a) => ({
      marketplaces: acc.marketplaces + a.stats.total_marketplaces,
      plugins: acc.plugins + a.stats.total_plugins
    }),
    { marketplaces: 0, plugins: 0 }
  );

  // Build shared meta object (minimal fields only)
  const meta = {
    total_authors: authorsList.length,
    total_marketplaces: totals.marketplaces,
    total_plugins: totals.plugins
  };

  // Write per-author files
  for (const author of Object.values(authors)) {
    // Transform marketplaces to remove unused fields
    const marketplaces = [...author.marketplaces]
      .sort((a, b) => (b.signals?.stars || 0) - (a.signals?.stars || 0))
      .map(m => ({
        name: m.name,
        version: m.version,
        description: m.description,
        repo_full_name: m.repo_full_name,
        repo_url: m.repo_url,
        repo_description: m.repo_description,
        signals: {
          stars: m.signals?.stars || 0,
          forks: m.signals?.forks || 0,
          pushed_at: m.signals?.pushed_at || null
        },
        files: m.files,
        plugins: m.plugins
      }));

    const authorData = {
      author: {
        id: author.id,
        display_name: author.display_name,
        avatar_url: author.avatar_url
      },
      marketplaces
    };

    const authorPath = `${AUTHORS_DIR}/${sanitizeFilename(author.id)}.json`;
    saveJson(authorPath, authorData);
  }

  log(`Generated ${Object.keys(authors).length} author files in ${AUTHORS_DIR}/`);

  // Generate marketplaces browse array (sorted by pushed_at, most recent first)
  const marketplacesBrowse = [];
  for (const author of Object.values(authors)) {
    for (const marketplace of author.marketplaces) {
      const catData = categorizedMap.get(marketplace.repo_full_name);

      // Use flat category array from categorizer
      const categories = catData?.categories || [];

      // Aggregate keywords from all plugins in the marketplace
      const keywords = [...new Set(
        marketplace.plugins
          .flatMap(p => p.keywords || [])
          .filter(k => typeof k === 'string' && k.trim())
      )];

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
        categories,
        keywords
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

  // Summary
  log('');
  log('=== Output Summary ===');
  log(`Authors: ${authorsList.length}`);
  log(`Marketplaces: ${totals.marketplaces}`);
  log(`Plugins: ${totals.plugins}`);

  return { meta, marketplaces: marketplacesBrowse };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    output();
  } catch (error) {
    logError('Output error', error);
  }
}
