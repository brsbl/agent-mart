import { searchCode, safeApiCall, checkFileExists } from '../lib/github.js';
import { saveJson, loadJson, log, logError, getRepoLimit } from '../lib/utils.js';

const OUTPUT_PATH = './data/01-discovered.json';
const REPO_LIMIT = getRepoLimit();
const STANDARD_PATH = '.claude-plugin/marketplace.json';

/**
 * Load previously discovered repos to avoid dropping due to search variance
 */
function loadPreviousRepos() {
  try {
    const previous = loadJson(OUTPUT_PATH);
    if (previous?.repos?.length) {
      log(`Loaded ${previous.repos.length} previously discovered repos`);
      return new Map(previous.repos.map(r => [r.full_name, r]));
    }
  } catch {
    // No previous data
  }
  return new Map();
}

/**
 * Run a single search pass through all pages
 * @param {number} passNumber - Which pass this is (for logging)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Map<string, Object>>} Map of full_name -> repo data
 */
async function runSearchPass(passNumber, onProgress) {
  log(`Search pass ${passNumber}: starting...`);
  const results = [];
  let page = 1;
  let totalCount = 0;

  while (true) {
    const response = await safeApiCall(
      () => searchCode('path:.claude-plugin filename:marketplace.json', page),
      `pass ${passNumber} page ${page}`
    );

    if (!response) break;

    if (page === 1) {
      totalCount = response.total_count;
      log(`Search pass ${passNumber}: found ${totalCount} total results`);
    }

    for (const item of response.items || []) {
      results.push({
        owner: item.repository.owner.login,
        repo: item.repository.name,
        full_name: item.repository.full_name,
        marketplace_path: item.path
      });
    }

    log(`Search pass ${passNumber}: ${results.length}/${totalCount} repos...`);
    onProgress?.(results.length, totalCount);

    // Check REPO_LIMIT first
    if (REPO_LIMIT && results.length >= REPO_LIMIT) {
      log(`Search pass ${passNumber}: reached REPO_LIMIT of ${REPO_LIMIT}`);
      break;
    }

    // Continue if we haven't fetched all results yet
    if (!response.items || response.items.length === 0) break;
    if (results.length >= totalCount) break;
    if (results.length >= 1000) {
      log(`Search pass ${passNumber}: reached max 1000 results limit`);
      break;
    }

    page++;
  }

  // Filter to standard path and deduplicate
  const repoMap = new Map();
  for (const repo of results) {
    if (repo.marketplace_path === STANDARD_PATH) {
      repoMap.set(repo.full_name, repo);
    }
  }

  log(`Search pass ${passNumber}: found ${repoMap.size} unique repos`);
  return repoMap;
}

/**
 * Check if a search pass is missing any repos from previous run
 */
function hasMissingRepos(searchResults, previousRepos) {
  for (const fullName of previousRepos.keys()) {
    if (!searchResults.has(fullName)) {
      return true;
    }
  }
  return false;
}

/**
 * Merge multiple search results into one map
 */
function mergeResults(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, value] of map) {
      merged.set(key, value);
    }
  }
  return merged;
}

/**
 * Discover all repositories containing marketplace.json
 * Uses multiple search passes to handle GitHub search variance
 */
export async function discover({ onProgress } = {}) {
  log('Starting marketplace discovery...');
  if (REPO_LIMIT) {
    log(`REPO_LIMIT set to ${REPO_LIMIT} - will stop after finding ${REPO_LIMIT} repos`);
  }

  const previousRepos = loadPreviousRepos();

  // Pass 1
  const pass1Results = await runSearchPass(1, onProgress);

  // Pass 2
  const pass2Results = await runSearchPass(2, onProgress);

  // Check if either pass is missing repos from previous run
  let pass3Results = new Map();
  const pass1Missing = hasMissingRepos(pass1Results, previousRepos);
  const pass2Missing = hasMissingRepos(pass2Results, previousRepos);

  if (pass1Missing || pass2Missing) {
    log(`Previous repos missing from pass 1: ${pass1Missing}, pass 2: ${pass2Missing}`);
    log('Running pass 3 to improve coverage...');
    pass3Results = await runSearchPass(3, onProgress);
  }

  // Merge all results
  const allDiscovered = mergeResults(pass1Results, pass2Results, pass3Results);
  log(`Total unique repos from all passes: ${allDiscovered.size}`);

  // Find repos still missing after all passes
  const missingRepos = [];
  for (const [fullName, repo] of previousRepos) {
    if (!allDiscovered.has(fullName)) {
      missingRepos.push(repo);
    }
  }

  // Verify missing repos still have marketplace.json before dropping them
  if (missingRepos.length > 0) {
    log(`Verifying ${missingRepos.length} repos missing from all search passes...`);
    for (const repo of missingRepos) {
      const stillExists = await safeApiCall(
        () => checkFileExists(repo.owner, repo.repo, STANDARD_PATH),
        `check ${repo.full_name}`
      );
      if (stillExists) {
        log(`  Keeping ${repo.full_name} (file still exists, search missed it)`);
        allDiscovered.set(repo.full_name, repo);
      } else {
        log(`  Dropping ${repo.full_name} (file no longer exists)`);
      }
    }
  }

  let unique = [...allDiscovered.values()];

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
