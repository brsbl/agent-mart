import { batchGetRepos } from '../lib/github.js';
import { saveJson, loadJson, log, logError, applyRepoLimit } from '../lib/utils.js';

const INPUT_PATH = './data/01-discovered.json';
const OUTPUT_PATH = './data/02-repos.json';

/**
 * Fetch repository and owner metadata for all discovered repos
 * Uses GraphQL batching for efficiency (90% fewer API calls)
 */
export async function fetchRepos({ onProgress: _onProgress } = {}) {
  log('Starting repo metadata fetch...');

  const data = loadJson(INPUT_PATH);
  const allRepos = data?.repos || [];
  if (allRepos.length === 0) {
    log('No repos found in input file');
    return { repos: [], owners: {} };
  }
  const repos = applyRepoLimit(allRepos);

  // Use GraphQL batching to fetch all repos and owners in batches of 15
  const batchInput = repos.map(r => ({ owner: r.owner, repo: r.repo }));
  const { repos: repoData, owners: ownerData, deleted, failed } = await batchGetRepos(batchInput);

  // Transform results to match expected output format
  const enriched = [];
  const renames = {};

  for (const { full_name, marketplace_path } of repos) {
    const data = repoData[full_name];
    if (!data) continue;

    // Detect repo renames/transfers: use actual owner from API response
    const actualOwner = data.owner.login;
    const actualFullName = `${actualOwner}/${data.name}`;

    // Log and record if repo was renamed/transferred
    if (actualFullName.toLowerCase() !== full_name.toLowerCase()) {
      log(`Repo renamed/transferred: ${full_name} → ${actualFullName}`);
      renames[full_name] = actualFullName;
    }

    enriched.push({
      full_name: actualFullName,
      marketplace_path,
      default_branch: data.default_branch,
      default_branch_sha: data.default_branch_sha,
      repo: {
        description: data.description,
        homepage: data.homepage,
        signals: {
          stars: data.stargazers_count,
          forks: data.forks_count,
          pushed_at: data.pushed_at,
          created_at: data.created_at,
          license: data.license?.spdx_id || null
        }
      },
      owner: {
        id: actualOwner,
        type: ownerData[actualOwner]?.type || 'User',
        avatar_url: ownerData[actualOwner]?.avatar_url
      }
    });
  }

  // Transform owners to expected format
  const ownersOutput = {};
  for (const [login, data] of Object.entries(ownerData)) {
    ownersOutput[login] = {
      id: login,
      display_name: data.name || login,
      type: data.type,
      avatar_url: data.avatar_url,
      url: data.html_url,
      bio: data.bio,
      company: data.company,
      followers: data.followers
    };
  }

  if (deleted.length > 0) {
    log(`Deleted repos (404): ${deleted.join(', ')}`);
  }
  if (failed.length > 0) {
    log(`WARNING: ${failed.length} repos failed after retries: ${failed.join(', ')}`);
  }

  const dropped_repos = [
    ...deleted.map(name => ({ full_name: name, reason: 'deleted (404)' })),
    ...failed.map(name => ({ full_name: name, reason: 'failed after retries' })),
  ];

  const output = {
    fetched_at: new Date().toISOString(),
    total_repos: enriched.length,
    total_owners: Object.keys(ownersOutput).length,
    dropped_repos,
    repos: enriched,
    owners: ownersOutput,
    renames
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${enriched.length} repos and ${Object.keys(ownersOutput).length} owners to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchRepos().catch(err => logError('Fetch repos failed', err));
}
