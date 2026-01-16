import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';

const CATEGORIES_PATH = './data/marketplace-categories.json';
const ENRICHED_PATH = './data/06-enriched.json';

/**
 * Generate content hash for a marketplace
 */
function hashContent(description, pluginNames) {
  const content = [
    description || '',
    pluginNames.join(',')
  ].join('|');
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Detect which marketplaces need category updates
 */
async function detectChanges() {
  // Load current categories
  let categoriesData = { marketplaces: {} };
  if (existsSync(CATEGORIES_PATH)) {
    categoriesData = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf-8'));
  }

  // Load latest enriched data
  if (!existsSync(ENRICHED_PATH)) {
    console.log('No enriched data found. Run the pipeline first.');
    process.exit(1);
  }
  const enrichedData = JSON.parse(readFileSync(ENRICHED_PATH, 'utf-8'));

  const needsUpdate = [];
  const newMarketplaces = [];
  const changedMarketplaces = [];

  // Check each marketplace in enriched data
  for (const [authorId, author] of Object.entries(enrichedData.authors)) {
    for (const marketplace of author.marketplaces || []) {
      const repoKey = `${authorId}/${marketplace.name}`;
      const pluginNames = (marketplace.plugins || []).map(p => p.name);
      const currentHash = hashContent(
        marketplace.description || marketplace.repo_description,
        pluginNames
      );

      const existing = categoriesData.marketplaces[repoKey];

      if (!existing) {
        // New marketplace
        newMarketplaces.push(repoKey);
        needsUpdate.push({
          repo: repoKey,
          reason: 'new',
          hash: currentHash,
          description: marketplace.description || marketplace.repo_description,
          pluginNames
        });
      } else if (typeof existing === 'object' && existing.hash !== currentHash) {
        // Content changed
        changedMarketplaces.push(repoKey);
        needsUpdate.push({
          repo: repoKey,
          reason: 'changed',
          oldHash: existing.hash,
          hash: currentHash,
          description: marketplace.description || marketplace.repo_description,
          pluginNames
        });
      } else if (Array.isArray(existing)) {
        // Old format without hash - needs migration
        needsUpdate.push({
          repo: repoKey,
          reason: 'migrate',
          hash: currentHash,
          categories: existing,
          description: marketplace.description || marketplace.repo_description,
          pluginNames
        });
      }
    }
  }

  // Output results
  const hasChanges = needsUpdate.length > 0;

  console.log(`\nCategory Change Detection Results:`);
  console.log(`  New marketplaces: ${newMarketplaces.length}`);
  console.log(`  Changed marketplaces: ${changedMarketplaces.length}`);
  console.log(`  Total needing update: ${needsUpdate.length}`);

  if (newMarketplaces.length > 0) {
    console.log(`\nNew marketplaces:`);
    newMarketplaces.slice(0, 10).forEach(r => console.log(`  - ${r}`));
    if (newMarketplaces.length > 10) {
      console.log(`  ... and ${newMarketplaces.length - 10} more`);
    }
  }

  if (changedMarketplaces.length > 0) {
    console.log(`\nChanged marketplaces:`);
    changedMarketplaces.slice(0, 10).forEach(r => console.log(`  - ${r}`));
    if (changedMarketplaces.length > 10) {
      console.log(`  ... and ${changedMarketplaces.length - 10} more`);
    }
  }

  // Write needs-update list for the update script
  const outputPath = './data/.needs-category-update.json';
  const { writeFileSync, appendFileSync } = await import('fs');
  writeFileSync(outputPath, JSON.stringify(needsUpdate, null, 2));

  // Set GitHub Actions outputs
  const summary = `- **New:** ${newMarketplaces.length}\n- **Changed:** ${changedMarketplaces.length}`;

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${hasChanges}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `summary<<EOF\n${summary}\nEOF\n`);
  }

  return { hasChanges, needsUpdate, newMarketplaces, changedMarketplaces };
}

// Run
detectChanges().catch(console.error);
