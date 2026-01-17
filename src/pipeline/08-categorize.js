import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

async function loadJSON(filename) {
  const content = await readFile(join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

export async function categorize() {
  console.log('Loading taxonomy and analysis data...');

  const taxonomy = await loadJSON('category-taxonomy.json');
  const analysis = await loadJSON('marketplace-detailed-analysis.json');
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

  console.log(`Processing ${analysis.length} analyzed, ${allMarketplaces.length} total marketplaces...`);

  const tagMapping = taxonomy.tagMapping;

  // Create a map for quick lookup
  const analysisMap = new Map();
  for (const item of analysis) {
    analysisMap.set(item.repo, item);
  }

  // Categorize each marketplace
  const categorized = allMarketplaces.map(marketplace => {
    const repo = marketplace.repo_full_name;
    const analysisItem = analysisMap.get(repo);

    if (!analysisItem) {
      return {
        ...marketplace,
        categories: {
          verbs: [],
          nouns: [],
          integration: null
        },
        analysis: null
      };
    }

    const verbs = new Set();
    const nouns = new Set();

    // Map tags to categories
    for (const tag of analysisItem.stage_lifecycle_arch || []) {
      const mapping = tagMapping[tag];
      if (mapping) {
        if (mapping.verb) verbs.add(mapping.verb);
        if (mapping.noun) nouns.add(mapping.noun);
      }
    }

    // Normalize integration name
    let integration = analysisItem.integration;
    if (integration) {
      // Normalize common variations
      integration = integration
        .replace(/^next\.js$/i, 'Next.js')
        .replace(/^nextjs$/i, 'Next.js')
        .replace(/^react\.js$/i, 'React')
        .replace(/^reactjs$/i, 'React')
        .replace(/^playwright$/i, 'Playwright')
        .replace(/^github$/i, 'GitHub')
        .replace(/^git$/i, 'Git')
        .replace(/^claude code$/i, 'Claude Code')
        .replace(/^jira$/i, 'Jira')
        .replace(/^linear$/i, 'Linear')
        .replace(/^obsidian$/i, 'Obsidian')
        .replace(/^notion$/i, 'Notion')
        .replace(/^slack$/i, 'Slack')
        .replace(/^telegram$/i, 'Telegram')
        .replace(/^supabase$/i, 'Supabase')
        .replace(/^aws$/i, 'AWS')
        .replace(/^kubernetes$/i, 'Kubernetes')
        .replace(/^docker$/i, 'Docker')
        .replace(/^postgresql$/i, 'PostgreSQL')
        .replace(/^fastapi$/i, 'FastAPI')
        .replace(/^flutter$/i, 'Flutter')
        .replace(/^angular$/i, 'Angular')
        .replace(/^vue$/i, 'Vue')
        .replace(/^svelte$/i, 'Svelte')
        .replace(/^nuxt$/i, 'Nuxt');
    }

    return {
      ...marketplace,
      categories: {
        verbs: Array.from(verbs).sort(),
        nouns: Array.from(nouns).sort(),
        integration: integration || null
      },
      analysis: {
        function: analysisItem.function,
        value: analysisItem.value
      }
    };
  });

  // Generate category statistics
  const stats = {
    totalMarketplaces: categorized.length,
    withVerbs: categorized.filter(m => m.categories.verbs.length > 0).length,
    withNouns: categorized.filter(m => m.categories.nouns.length > 0).length,
    withIntegration: categorized.filter(m => m.categories.integration).length,
    withAnalysis: categorized.filter(m => m.analysis).length,
    verbCounts: {},
    nounCounts: {},
    integrationCounts: {}
  };

  for (const m of categorized) {
    for (const verb of m.categories.verbs) {
      stats.verbCounts[verb] = (stats.verbCounts[verb] || 0) + 1;
    }
    for (const noun of m.categories.nouns) {
      stats.nounCounts[noun] = (stats.nounCounts[noun] || 0) + 1;
    }
    if (m.categories.integration) {
      stats.integrationCounts[m.categories.integration] =
        (stats.integrationCounts[m.categories.integration] || 0) + 1;
    }
  }

  // Sort counts
  stats.verbCounts = Object.fromEntries(
    Object.entries(stats.verbCounts).sort((a, b) => b[1] - a[1])
  );
  stats.nounCounts = Object.fromEntries(
    Object.entries(stats.nounCounts).sort((a, b) => b[1] - a[1])
  );
  stats.integrationCounts = Object.fromEntries(
    Object.entries(stats.integrationCounts).sort((a, b) => b[1] - a[1])
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

  console.log('\nCategorization complete!');
  console.log(`  Total marketplaces: ${stats.totalMarketplaces}`);
  console.log(`  With verbs: ${stats.withVerbs}`);
  console.log(`  With nouns: ${stats.withNouns}`);
  console.log(`  With integration: ${stats.withIntegration}`);
  console.log(`  With analysis: ${stats.withAnalysis}`);

  console.log('\nTop verbs:');
  Object.entries(stats.verbCounts).slice(0, 10).forEach(([verb, count]) => {
    console.log(`  ${verb}: ${count}`);
  });

  console.log('\nTop nouns:');
  Object.entries(stats.nounCounts).slice(0, 10).forEach(([noun, count]) => {
    console.log(`  ${noun}: ${count}`);
  });

  console.log('\nTop integrations:');
  Object.entries(stats.integrationCounts).slice(0, 10).forEach(([int, count]) => {
    console.log(`  ${int}: ${count}`);
  });

  console.log('\nOutput files:');
  console.log('  - data/marketplaces-categorized.json');
  console.log('  - data/category-stats.json');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  categorize().catch(console.error);
}
