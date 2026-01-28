import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

async function loadJSON(filename) {
  try {
    const content = await readFile(join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filename}: ${error.message}`);
  }
}

export async function categorize({ onProgress: _onProgress } = {}) {
  console.log('Loading enriched marketplace data...');

  const enrichedRaw = await loadJSON('06-enriched.json');

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

  console.log(`Processing ${allMarketplaces.length} marketplaces...`);

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
  await writeFile(
    join(DATA_DIR, 'marketplaces-categorized.json'),
    JSON.stringify(categorized, null, 2)
  );

  await writeFile(
    join(DATA_DIR, 'category-stats.json'),
    JSON.stringify(stats, null, 2)
  );

  // Write empty taxonomy (categories are now dynamic)
  await writeFile(
    join(DATA_DIR, 'category-taxonomy.json'),
    JSON.stringify({ categories: {} }, null, 2)
  );

  console.log('\nCategorization complete!');
  console.log(`  Total marketplaces: ${stats.totalMarketplaces}`);
  const percentage = stats.totalMarketplaces > 0
    ? ((stats.withCategories / stats.totalMarketplaces) * 100).toFixed(1)
    : '0.0';
  console.log(`  With categories: ${stats.withCategories} (${percentage}%)`);

  console.log('\nCategory distribution:');
  for (const [cat, count] of Object.entries(stats.categoryCounts)) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log('\nOutput files:');
  console.log('  - data/marketplaces-categorized.json');
  console.log('  - data/category-stats.json');
  console.log('  - data/category-taxonomy.json');

  // Return categorized data for visualizer metrics
  return categorized;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  categorize().catch(console.error);
}
