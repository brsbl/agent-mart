import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { extractCategories, generateTaxonomy, TECH_STACK_RULES, CAPABILITIES_RULES } from '../lib/categorizer.js';

const DATA_DIR = join(process.cwd(), 'data');

async function loadJSON(filename) {
  const content = await readFile(join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

export async function categorize() {
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

  console.log(`Processing ${allMarketplaces.length} marketplaces with rules-based categorization...`);

  // Categorize each marketplace using extraction rules
  const categorized = allMarketplaces.map(marketplace => {
    const categories = extractCategories(marketplace);

    return {
      ...marketplace,
      categories
    };
  });

  // Generate category statistics
  const stats = {
    totalMarketplaces: categorized.length,
    withTechStack: categorized.filter(m => m.categories.techStack.length > 0).length,
    withCapabilities: categorized.filter(m => m.categories.capabilities.length > 0).length,
    withAnyCategory: categorized.filter(m =>
      m.categories.techStack.length > 0 || m.categories.capabilities.length > 0
    ).length,
    techStackCounts: {},
    capabilityCounts: {}
  };

  // Count tech stack occurrences
  for (const m of categorized) {
    for (const tech of m.categories.techStack) {
      stats.techStackCounts[tech] = (stats.techStackCounts[tech] || 0) + 1;
    }
    for (const cap of m.categories.capabilities) {
      stats.capabilityCounts[cap] = (stats.capabilityCounts[cap] || 0) + 1;
    }
  }

  // Sort counts by frequency
  stats.techStackCounts = Object.fromEntries(
    Object.entries(stats.techStackCounts).sort((a, b) => b[1] - a[1])
  );
  stats.capabilityCounts = Object.fromEntries(
    Object.entries(stats.capabilityCounts).sort((a, b) => b[1] - a[1])
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

  // Write taxonomy for reference
  const taxonomy = generateTaxonomy();
  await writeFile(
    join(DATA_DIR, 'category-taxonomy.json'),
    JSON.stringify(taxonomy, null, 2)
  );

  console.log('\nCategorization complete!');
  console.log(`  Total marketplaces: ${stats.totalMarketplaces}`);
  console.log(`  With tech stack: ${stats.withTechStack} (${((stats.withTechStack / stats.totalMarketplaces) * 100).toFixed(1)}%)`);
  console.log(`  With capabilities: ${stats.withCapabilities} (${((stats.withCapabilities / stats.totalMarketplaces) * 100).toFixed(1)}%)`);
  console.log(`  With any category: ${stats.withAnyCategory} (${((stats.withAnyCategory / stats.totalMarketplaces) * 100).toFixed(1)}%)`);

  console.log('\nTech Stack distribution:');
  for (const [tech, count] of Object.entries(stats.techStackCounts)) {
    const label = TECH_STACK_RULES[tech]?.label || tech;
    console.log(`  ${label}: ${count}`);
  }

  console.log('\nCapabilities distribution:');
  for (const [cap, count] of Object.entries(stats.capabilityCounts)) {
    const label = CAPABILITIES_RULES[cap]?.label || cap;
    console.log(`  ${label}: ${count}`);
  }

  console.log('\nOutput files:');
  console.log('  - data/marketplaces-categorized.json');
  console.log('  - data/category-stats.json');
  console.log('  - data/category-taxonomy.json');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  categorize().catch(console.error);
}
