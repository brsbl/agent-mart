import { getTree, safeApiCall } from '../lib/github.js';
import { getCached, setCache } from '../lib/cache.js';
import { saveJson, loadJson, log, getRepoLimit } from '../lib/utils.js';

const INPUT_PATH = './data/02-repos.json';
const OUTPUT_PATH = './data/03-trees.json';
const REPO_LIMIT = getRepoLimit();

/**
 * Fetch full file trees for all repos
 * Uses caching by commit SHA (immutable, never expires)
 */
export async function fetchTrees() {
  log('Starting file tree fetch...');

  const { repos: allRepos } = loadJson(INPUT_PATH);
  const repos = REPO_LIMIT ? allRepos.slice(0, REPO_LIMIT) : allRepos;

  if (REPO_LIMIT) {
    log(`REPO_LIMIT set to ${REPO_LIMIT} - processing ${repos.length} of ${allRepos.length} repos`);
  }

  const trees = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  for (let i = 0; i < repos.length; i++) {
    const { full_name, default_branch, default_branch_sha } = repos[i];
    const [owner, repo] = full_name.split('/');

    log(`[${i + 1}/${repos.length}] Fetching tree for ${full_name}`);

    // Try to get from cache using SHA (immutable)
    if (default_branch_sha) {
      const cached = getCached('tree', default_branch_sha, 0);
      if (cached) {
        trees.push({
          full_name,
          default_branch,
          tree: cached.tree,
          truncated: cached.truncated
        });
        cacheHits++;
        continue;
      }
    }

    cacheMisses++;

    const treeData = await safeApiCall(
      () => getTree(owner, repo, default_branch),
      `tree ${full_name}`
    );

    if (!treeData) {
      trees.push({ full_name, default_branch, tree: [], truncated: false });
      continue;
    }

    // Extract only the fields we need
    const tree = treeData.tree.map(entry => ({
      path: entry.path,
      type: entry.type, // 'blob' for files, 'tree' for directories
      size: entry.size || null
    }));

    const treeEntry = {
      full_name,
      default_branch,
      tree,
      truncated: treeData.truncated || false
    };

    trees.push(treeEntry);

    // Cache by SHA if available (immutable, never expires)
    if (default_branch_sha) {
      setCache('tree', default_branch_sha, {
        tree,
        truncated: treeData.truncated || false
      });
    }

    if (treeData.truncated) {
      log(`Warning: Tree truncated for ${full_name} (>100k files)`);
    }
  }

  log(`Cache stats: ${cacheHits} hits, ${cacheMisses} misses`);

  const output = {
    fetched_at: new Date().toISOString(),
    total: trees.length,
    trees
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${trees.length} file trees to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTrees().catch(console.error);
}
