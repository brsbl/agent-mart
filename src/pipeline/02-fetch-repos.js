import { batchGetRepos } from '../lib/github.js';
import { saveJson, loadJson, log, applyRepoLimit } from '../lib/utils.js';

const INPUT_PATH = './data/01-discovered.json';
const OUTPUT_PATH = './data/02-repos.json';

/**
 * Fetch repository and owner metadata for all discovered repos
 * Uses GraphQL batching for efficiency (90% fewer API calls)
 */
export async function fetchRepos() {
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
  const { repos: repoData, owners: ownerData } = await batchGetRepos(batchInput);

  // Transform results to match expected output format
  const enriched = [];

  for (const { full_name, marketplace_path } of repos) {
    const data = repoData[full_name];
    if (!data) {
      log(`No data for ${full_name}, skipping`);
      continue;
    }

    enriched.push({
      full_name,
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
        id: data.owner.login,
        type: ownerData[data.owner.login]?.type || 'User',
        avatar_url: ownerData[data.owner.login]?.avatar_url
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

  const output = {
    fetched_at: new Date().toISOString(),
    total_repos: enriched.length,
    total_owners: Object.keys(ownersOutput).length,
    repos: enriched,
    owners: ownersOutput
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${enriched.length} repos and ${Object.keys(ownersOutput).length} owners to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchRepos().catch(console.error);
}
