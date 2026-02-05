import { searchCode, safeApiCall } from '../lib/github.js';
import { saveJson, log, logError, getRepoLimit } from '../lib/utils.js';

const OUTPUT_PATH = './data/01-discovered.json';
const REPO_LIMIT = getRepoLimit();

/**
 * Discover all repositories containing marketplace.json
 */
export async function discover({ onProgress } = {}) {
  log('Starting marketplace discovery...');
  if (REPO_LIMIT) {
    log(`REPO_LIMIT set to ${REPO_LIMIT} - will stop after finding ${REPO_LIMIT} repos`);
  }

  const results = [];
  let page = 1;
  let totalCount = 0;

  while (true) {
    const response = await safeApiCall(
      () => searchCode('path:.claude-plugin filename:marketplace.json', page),
      `code search page ${page}`
    );

    if (!response) break;

    if (page === 1) {
      totalCount = response.total_count;
      log(`Found ${totalCount} total results`);
    }

    for (const item of response.items || []) {
      results.push({
        owner: item.repository.owner.login,
        repo: item.repository.name,
        full_name: item.repository.full_name,
        marketplace_path: item.path
      });
    }

    log(`Discovered ${results.length}/${totalCount} repos...`);
    onProgress?.(results.length, totalCount);

    // Check REPO_LIMIT first
    if (REPO_LIMIT && results.length >= REPO_LIMIT) {
      log(`Reached REPO_LIMIT of ${REPO_LIMIT}`);
      break;
    }

    if (!response.items || response.items.length < 100) break;
    if (results.length >= 1000) {
      log('Reached max 1000 results limit');
      break;
    }

    page++;
  }

  // Deduplicate by full_name (in case same repo appears multiple times)
  let unique = [...new Map(results.map(r => [r.full_name, r])).values()];

  // Filter to only standard marketplace paths (skip .backup, .sample, etc.)
  const STANDARD_PATH = '.claude-plugin/marketplace.json';
  const beforeFilter = unique.length;
  unique = unique.filter(r => r.marketplace_path === STANDARD_PATH);
  if (beforeFilter !== unique.length) {
    log(`Filtered out ${beforeFilter - unique.length} non-standard paths (kept only ${STANDARD_PATH})`);
  }

  // Apply REPO_LIMIT to final output
  if (REPO_LIMIT && unique.length > REPO_LIMIT) {
    unique = unique.slice(0, REPO_LIMIT);
    log(`Trimmed to ${REPO_LIMIT} repos due to REPO_LIMIT`);
  }

  const output = {
    discovered_at: new Date().toISOString(),
    total: unique.length,
    repos: unique
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${unique.length} unique marketplace repos to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  discover().catch(err => logError('Discovery failed', err));
}
