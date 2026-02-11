import { searchCode, safeApiCall, batchVerifyFileExists } from '../lib/github.js';
import { saveJson, loadJson, log, logError, getRepoLimit } from '../lib/utils.js';

const OUTPUT_PATH = './data/01-discovered.json';
const FETCHED_PATH = './data/02-repos.json';
const REPO_LIMIT = getRepoLimit();
const STANDARD_PATH = '.claude-plugin/marketplace.json';


/**
 * Load renames map from the most recent fetch step output
 * @returns {Object} Map of old_full_name -> new_full_name
 */
function loadRenames() {
  try {
    const fetched = loadJson(FETCHED_PATH);
    if (fetched?.renames && Object.keys(fetched.renames).length > 0) {
      log(`Loaded ${Object.keys(fetched.renames).length} renames from fetch step`);
      return fetched.renames;
    }
  } catch {
    // No fetched data or no renames
  }
  return {};
}

/**
 * Load previously discovered repos to avoid dropping due to search variance
 * Applies any known renames so stale full_name entries are updated.
 */
function loadPreviousRepos() {
  try {
    const previous = loadJson(OUTPUT_PATH);
    if (previous?.repos?.length) {
      log(`Loaded ${previous.repos.length} previously discovered repos`);
      const renames = loadRenames();
      const repoMap = new Map();
      for (const r of previous.repos) {
        const newName = renames[r.full_name];
        if (newName) {
          log(`Applying rename: ${r.full_name} → ${newName}`);
          const [owner, repo] = newName.split('/');
          repoMap.set(newName, { ...r, full_name: newName, owner, repo });
        } else {
          repoMap.set(r.full_name, r);
        }
      }
      return repoMap;
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
 * Phase A: Verify all known repos still have marketplace.json
 * @param {Map<string, Object>} previousRepos - Previously discovered repos
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{verified: Map<string, Object>, dropped: string[]}>}
 */
async function verifyKnownRepos(previousRepos, onProgress) {
  if (previousRepos.size === 0) {
    return { verified: new Map(), dropped: [] };
  }

  log(`Phase A: Verifying ${previousRepos.size} known repos...`);
  const repos = [...previousRepos.values()];
  const existsMap = await batchVerifyFileExists(repos, STANDARD_PATH);

  const verified = new Map();
  const dropped = [];

  for (const [fullName, repo] of previousRepos) {
    const exists = existsMap.get(fullName);
    if (exists) {
      verified.set(fullName, repo);
    } else {
      dropped.push(fullName);
      log(`  Dropping ${fullName} (file no longer exists or repo removed)`);
    }
  }

  log(`Phase A: ${verified.size} verified, ${dropped.length} dropped`);
  onProgress?.(verified.size, previousRepos.size);

  return { verified, dropped };
}

/**
 * Discover all repositories containing marketplace.json
 * Phase A: Verify known repos still have marketplace.json via GraphQL
 * Phase B: Run Code Search passes for new repos
 */
export async function discover({ onProgress } = {}) {
  log('Starting marketplace discovery...');
  if (REPO_LIMIT) {
    log(`REPO_LIMIT set to ${REPO_LIMIT} - will stop after finding ${REPO_LIMIT} repos`);
  }

  const stats = {
    phase_a_verified: 0,
    phase_a_dropped: 0,
    phase_b_new_from_search: 0
  };

  // Load previous repos
  const previousRepos = loadPreviousRepos();

  // Phase A: Verify known repos
  const { verified, dropped } = await verifyKnownRepos(previousRepos, onProgress);
  stats.phase_a_verified = verified.size;
  stats.phase_a_dropped = dropped.length;

  // Phase B: Code Search passes for genuinely new repos
  log('Phase B: Running Code Search passes...');
  const pass1Results = await runSearchPass(1, onProgress);
  const pass2Results = await runSearchPass(2, onProgress);

  // Run a conditional third pass when search results show variance
  let pass3Results = new Map();
  if (pass1Results.size !== pass2Results.size) {
    log(`Search variance detected (pass1: ${pass1Results.size}, pass2: ${pass2Results.size}), running pass 3...`);
    pass3Results = await runSearchPass(3, onProgress);
  }

  // Identify genuinely new repos from search (not already in verified set)
  const searchNew = new Map();
  for (const searchMap of [pass1Results, pass2Results, pass3Results]) {
    for (const [fullName, repo] of searchMap) {
      if (!verified.has(fullName) && !searchNew.has(fullName)) {
        searchNew.set(fullName, repo);
      }
    }
  }
  stats.phase_b_new_from_search = searchNew.size;

  log(`Phase B: Found ${searchNew.size} genuinely new repos from search`);

  // Merge: verified + search-new
  const allDiscovered = mergeResults(verified, searchNew);
  log(`Total unique repos: ${allDiscovered.size}`);

  let unique = [...allDiscovered.values()];

  // Apply REPO_LIMIT to final output
  if (REPO_LIMIT && unique.length > REPO_LIMIT) {
    unique = unique.slice(0, REPO_LIMIT);
    log(`Trimmed to ${REPO_LIMIT} repos due to REPO_LIMIT`);
  }

  const output = {
    discovered_at: new Date().toISOString(),
    total: unique.length,
    discovery_stats: stats,
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
