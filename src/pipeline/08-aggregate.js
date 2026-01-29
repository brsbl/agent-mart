import { join } from 'path';
import { loadJson, saveJson, log, logError } from '../lib/utils.js';

const DATA_DIR = join(process.cwd(), 'data');

export async function aggregate({ onProgress: _onProgress } = {}) {
  log('Loading enriched marketplace data...');

  const enrichedRaw = loadJson(join(DATA_DIR, '06-enriched.json'));

  // Extract all marketplaces from the enriched data (organized by author)
  const allMarketplaces = [];
  for (const author of Object.values(enrichedRaw.authors || {})) {
    for (const marketplace of author.marketplaces || []) {
      allMarketplaces.push({
        ...marketplace,
        author: {
          id: author.id,
          display_name: author.display_name,
          avatar_url: author.avatar_url
        }
      });
    }
  }

  log(`Processing ${allMarketplaces.length} marketplaces...`);

  // Aggregate categories from all plugins for each marketplace
  const categorized = allMarketplaces.map(marketplace => {
    // Collect all unique categories from plugins
    const pluginCategories = new Set();
    for (const plugin of marketplace.plugins || []) {
      for (const cat of plugin.categories || []) {
        pluginCategories.add(cat);
      }
    }

    return {
      ...marketplace,
      categories: Array.from(pluginCategories).sort()
    };
  });

  // Generate category statistics
  const stats = {
    totalMarketplaces: categorized.length,
    withCategories: categorized.filter(m => m.categories.length > 0).length,
    categoryCounts: {}
  };

  // Count category occurrences
  for (const m of categorized) {
    for (const cat of m.categories) {
      stats.categoryCounts[cat] = (stats.categoryCounts[cat] || 0) + 1;
    }
  }

  // Sort counts by frequency
  stats.categoryCounts = Object.fromEntries(
    Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1])
  );

  // Write outputs
  saveJson(join(DATA_DIR, 'marketplaces-categorized.json'), categorized);
  saveJson(join(DATA_DIR, 'category-stats.json'), stats);

  log('Categorization complete!');
  log(`  Total marketplaces: ${stats.totalMarketplaces}`);
  const percentage = stats.totalMarketplaces > 0
    ? ((stats.withCategories / stats.totalMarketplaces) * 100).toFixed(1)
    : '0.0';
  log(`  With categories: ${stats.withCategories} (${percentage}%)`);

  log('Category distribution:');
  for (const [cat, count] of Object.entries(stats.categoryCounts)) {
    log(`  ${cat}: ${count}`);
  }

  log('Output files:');
  log('  - data/marketplaces-categorized.json');
  log('  - data/category-stats.json');

  // Return categorized data for visualizer metrics
  return categorized;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregate().catch(err => logError('Aggregation failed', err));
}
