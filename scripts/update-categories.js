import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CATEGORIES_PATH = './data/marketplace-categories.json';
const NEEDS_UPDATE_PATH = './data/.needs-category-update.json';

// Category detection patterns (same as original categorization)
const CATEGORY_PATTERNS = {
  'multi-agent': [
    /orchestrat/i, /multi-agent/i, /swarm/i, /agent.*workflow/i, /autonomous/i,
    /delegation/i, /crew/i, /coordinator/i, /parallel.*agent/i, /agent.*sdk/i
  ],
  'testing-automation': [
    /playwright/i, /cypress/i, /selenium/i, /e2e/i, /browser.*auto/i,
    /test.*runner/i, /unit.*test/i, /integration.*test/i, /\bqa\b/i, /devtools/i
  ],
  'web-frameworks': [
    /\bnext\.?js\b/i, /\breact\b/i, /\bvue\b/i, /\bsvelte\b/i, /\bangular\b/i,
    /\bastro\b/i, /\bremix\b/i, /frontend.*framework/i, /payload/i
  ],
  'backend-frameworks': [
    /\bdjango\b/i, /\bfastapi\b/i, /\brails\b/i, /\bexpress\b/i, /\blaravel\b/i,
    /\bflask\b/i, /\bspring\b/i, /\bdotnet\b/i, /\.net\b/i, /\bnestjs\b/i
  ],
  'code-quality': [
    /code.*review/i, /pr.*review/i, /pull.*request.*review/i, /\blint/i,
    /refactor/i, /code.*quality/i, /standards/i, /eslint/i, /prettier/i,
    /\blsp\b/i, /language.*server/i
  ],
  'devops-infra': [
    /\bdocker\b/i, /\bkubernetes\b/i, /\bk8s\b/i, /\bterraform\b/i,
    /ci[\-\/]cd/i, /\bdeploy/i, /infrastructure/i, /github.*action/i,
    /\bhelm\b/i, /\bansible\b/i, /cloud.*infra/i, /\baws\b/i, /\bgcp\b/i
  ],
  'databases-data': [
    /\bsql\b/i, /\bpostgres/i, /\bmysql\b/i, /\bmongo/i, /database/i,
    /\betl\b/i, /\bdbt\b/i, /data.*engineer/i, /analytics/i, /\bairflow\b/i,
    /\bduckdb\b/i, /timescale/i
  ],
  'api-integrations': [
    /\bfirebase\b/i, /\bstripe\b/i, /\bjira\b/i, /\bslack\b/i, /\bnotion\b/i,
    /\blinear\b/i, /\bairtable\b/i, /\bmcp\b/i, /webhook/i, /integration/i,
    /\btelegram\b/i, /\bdiscord\b/i, /api.*connect/i
  ],
  'planning-workflow': [
    /spec.*driven/i, /\btdd\b/i, /\bbdd\b/i, /planning/i, /methodology/i,
    /architecture/i, /workflow/i, /task.*manage/i, /project.*manage/i,
    /milestone/i, /roadmap/i, /sprint/i
  ],
  'enterprise-domain': [
    /\bsap\b/i, /finance/i, /fintech/i, /\bweb3\b/i, /blockchain/i,
    /healthcare/i, /medical/i, /legal/i, /\bcrypto\b/i, /\bnft\b/i,
    /defi/i, /uniswap/i, /enterprise/i, /compliance/i
  ],
  'ai-ml-tools': [
    /\bllm\b/i, /\brag\b/i, /embedding/i, /vector/i, /prompt.*engineer/i,
    /model.*fine/i, /machine.*learn/i, /gemini/i, /codex/i, /gpt/i,
    /claude.*api/i, /repomix/i
  ],
  'productivity-tools': [
    /documentation/i, /readme/i, /personal/i, /utility/i, /tool(?:s|kit)/i,
    /productivity/i, /template/i, /scaffold/i, /generator/i, /dotfile/i,
    /config/i, /setup/i, /writing/i, /notes/i, /obsidian/i
  ]
};

/**
 * Categorize a marketplace based on its content
 */
function categorize(description, pluginNames) {
  const text = [description || '', ...pluginNames].join(' ');

  const matches = [];
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches.push(category);
        break;
      }
    }
  }

  // Dedupe and limit to 3
  const unique = [...new Set(matches)].slice(0, 3);
  return unique.length > 0 ? unique : ['productivity-tools'];
}

/**
 * Generate content hash
 */
function hashContent(description, pluginNames) {
  const content = [description || '', pluginNames.join(',')].join('|');
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Update categories for marketplaces that need it
 */
function updateCategories() {
  // Load needs-update list
  if (!existsSync(NEEDS_UPDATE_PATH)) {
    console.log('No updates needed (file not found)');
    return;
  }

  let needsUpdate;
  try {
    needsUpdate = JSON.parse(readFileSync(NEEDS_UPDATE_PATH, 'utf-8'));
  } catch (error) {
    console.error(`Error parsing ${NEEDS_UPDATE_PATH}: ${error.message}`);
    process.exit(1);
  }

  if (needsUpdate.length === 0) {
    console.log('No updates needed');
    return;
  }

  // Load current categories
  let categoriesData;
  try {
    categoriesData = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf-8'));
  } catch (error) {
    console.error(`Error parsing ${CATEGORIES_PATH}: ${error.message}`);
    process.exit(1);
  }

  console.log(`Updating ${needsUpdate.length} marketplaces...`);

  let updated = 0;
  for (const item of needsUpdate) {
    const { repo, description, pluginNames, hash, reason } = item;

    // Re-categorize
    const categories = item.categories || categorize(description, pluginNames);

    // Update with new format including hash
    categoriesData.marketplaces[repo] = {
      categories,
      hash
    };

    console.log(`  ${repo}: ${categories.join(', ')} (${reason})`);
    updated++;
  }

  // Update metadata
  categoriesData.generated_at = new Date().toISOString().split('T')[0];

  // Recalculate distribution
  const distribution = {};
  for (const cat of Object.keys(CATEGORY_PATTERNS)) {
    distribution[cat] = 0;
  }
  for (const entry of Object.values(categoriesData.marketplaces)) {
    const cats = Array.isArray(entry) ? entry : entry.categories;
    for (const cat of cats) {
      distribution[cat] = (distribution[cat] || 0) + 1;
    }
  }
  categoriesData.distribution = Object.fromEntries(
    Object.entries(distribution).sort((a, b) => b[1] - a[1])
  );

  // Save
  writeFileSync(CATEGORIES_PATH, JSON.stringify(categoriesData, null, 2));
  console.log(`\nUpdated ${updated} marketplaces`);
}

// Run
updateCategories();
