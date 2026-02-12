import { batchGetFiles } from '../lib/github.js';
import { saveJson, loadJson, log, logError, applyRepoLimit, sleep } from '../lib/utils.js';

const MAX_FILE_RETRIES = 3;

const REPOS_PATH = './data/02-repos.json';
const OUTPUT_PATH = './data/04-files.json';

// Base file paths to fetch from each repository
const BASE_PATHS = [
  '.claude-plugin/marketplace.json',
  '.claude-plugin/plugin.json',
  'README.md' // Fallback README at repo root
];

/**
 * Extract plugin README paths from marketplace.json content
 * Returns paths like 'plugins/git/README.md' for each plugin with a source
 */
function getPluginReadmePaths(marketplaceContent) {
  try {
    const data = JSON.parse(marketplaceContent);
    const plugins = data.plugins || [];
    const paths = [];

    for (const plugin of plugins) {
      if (plugin.source && typeof plugin.source === 'string') {
        // Normalize: remove leading ./ and trailing /
        const sourcePath = plugin.source.replace(/^\.?\//, '').replace(/\/$/, '');
        if (sourcePath && sourcePath !== '.') {
          paths.push(`${sourcePath}/README.md`);
        }
      }
    }

    return paths;
  } catch (error) {
    log(`Failed to parse marketplace.json: ${error.message}`);
    return [];
  }
}

/**
 * Fetch essential plugin files from repositories
 * Two-pass approach:
 * 1. Fetch base files (marketplace.json, plugin.json, repo README)
 * 2. Parse marketplace.json and fetch README from each plugin's source directory
 */
export async function fetchFiles({ onProgress } = {}) {
  log('Starting file content fetch...');

  const { repos: allRepos } = loadJson(REPOS_PATH);
  const files = [];
  const dropped = [];

  const reposToProcess = applyRepoLimit(allRepos);

  for (let i = 0; i < reposToProcess.length; i++) {
    const { full_name, default_branch } = reposToProcess[i];

    if (!full_name || !full_name.includes('/')) {
      log(`Invalid full_name: ${full_name}, skipping`);
      dropped.push({ full_name: full_name || '(empty)', reason: 'invalid full_name' });
      continue;
    }

    const [owner, repo] = full_name.split('/');
    const branch = default_branch || 'main';

    onProgress?.(i + 1, reposToProcess.length);

    // Pass 1: Fetch base files (retry with backoff on failure)
    let baseResults;
    for (let attempt = 1; attempt <= MAX_FILE_RETRIES; attempt++) {
      try {
        baseResults = await batchGetFiles(owner, repo, branch, BASE_PATHS);
        break;
      } catch (error) {
        if (attempt < MAX_FILE_RETRIES) {
          const delay = 5000 * attempt;
          log(`File fetch failed for ${full_name} (attempt ${attempt}/${MAX_FILE_RETRIES}), retrying in ${delay / 1000}s...`);
          await sleep(delay);
        } else {
          log(`File fetch failed for ${full_name} after ${MAX_FILE_RETRIES} attempts: ${error.message}`);
          dropped.push({ full_name, reason: `batch fetch failed after ${MAX_FILE_RETRIES} attempts: ${error.message}` });
        }
      }
    }
    if (!baseResults) continue;

    // Store base files
    let fetchedCount = 0;
    for (const path of BASE_PATHS) {
      const fileData = baseResults[path];
      if (fileData && fileData.content) {
        files.push({
          full_name,
          path,
          size: fileData.size,
          sha: null,
          content: fileData.content
        });
        fetchedCount++;
      }
    }

    // Pass 2: Fetch per-plugin READMEs if marketplace.json exists
    const marketplaceFile = baseResults['.claude-plugin/marketplace.json'];
    if (marketplaceFile && marketplaceFile.content) {
      const pluginReadmePaths = getPluginReadmePaths(marketplaceFile.content);

      if (pluginReadmePaths.length > 0) {
        try {
          const readmeResults = await batchGetFiles(owner, repo, branch, pluginReadmePaths);

          for (const path of pluginReadmePaths) {
            const fileData = readmeResults[path];
            if (fileData && fileData.content) {
              files.push({
                full_name,
                path,
                size: fileData.size,
                sha: null,
                content: fileData.content
              });
              fetchedCount++;
            }
          }
        } catch (error) {
          log(`Plugin README fetch failed for ${full_name}: ${error.message}`);
        }
      }
    }

    if (fetchedCount > 0) {
      log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetched ${fetchedCount} files`);
    } else {
      log(`[${i + 1}/${reposToProcess.length}] ${full_name}: no files found`);
    }
  }

  if (dropped.length > 0) {
    log(`Dropped ${dropped.length}/${reposToProcess.length} repos: ${dropped.map(d => d.full_name).join(', ')}`);
  }

  const output = {
    fetched_at: new Date().toISOString(),
    total: files.length,
    dropped_repos: dropped,
    files
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${files.length} files to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchFiles().catch(err => logError('Fetch files failed', err));
}
