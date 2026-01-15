import { batchGetFiles, getFileContent, safeApiCall } from '../lib/github.js';
import { saveJson, loadJson, decodeBase64, log, applyRepoLimit } from '../lib/utils.js';

const TREES_PATH = './data/03-trees.json';
const OUTPUT_PATH = './data/04-files.json';

// Patterns for files we want to fetch
export const FILE_PATTERNS = [
  // Marketplace config (always fetch)
  /^\.claude-plugin\/marketplace\.json$/,
  // Plugin configs (root or nested)
  /(^|\/)?\.claude-plugin\/plugin\.json$/,
  // Commands (root or nested)
  /(^|\/)commands\/[^/]+\.md$/,
  // Skills - must be in skills/<skill-name>/SKILL.md format
  /(^|\/)skills\/[^/]+\/SKILL\.md$/
];

/**
 * Check if a file path matches our patterns
 */
function shouldFetchFile(path) {
  return FILE_PATTERNS.some(pattern => pattern.test(path));
}

/**
 * Fetch specific file contents for all repos
 * Uses GraphQL batching for efficiency (95% fewer API calls)
 */
export async function fetchFiles() {
  log('Starting file content fetch...');

  const { trees } = loadJson(TREES_PATH);
  const files = [];

  const reposToProcess = applyRepoLimit(trees);

  for (let i = 0; i < reposToProcess.length; i++) {
    const { full_name, default_branch, tree } = reposToProcess[i];

    if (!full_name || !full_name.includes('/')) {
      log(`Invalid full_name: ${full_name}, skipping`);
      continue;
    }

    const [owner, repo] = full_name.split('/');

    // Filter to files we want
    const filesToFetch = tree.filter(entry =>
      entry.type === 'blob' && shouldFetchFile(entry.path)
    );

    if (filesToFetch.length === 0) {
      log(`[${i + 1}/${reposToProcess.length}] ${full_name}: no matching files`);
      continue;
    }

    log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${filesToFetch.length} files`);

    // Use GraphQL batch fetching
    const paths = filesToFetch.map(entry => entry.path);
    const branch = default_branch || 'main';

    try {
      const batchResults = await batchGetFiles(owner, repo, branch, paths);

      // Process results
      for (const entry of filesToFetch) {
        const fileData = batchResults[entry.path];
        if (fileData && fileData.content) {
          files.push({
            full_name,
            path: entry.path,
            size: fileData.size || entry.size,
            sha: null, // GraphQL doesn't return SHA, not critical
            content: fileData.content
          });
        }
      }
    } catch (error) {
      // Fall back to individual REST calls if batch fails
      log(`Batch failed for ${full_name}, falling back to REST: ${error.message}`);
      for (const entry of filesToFetch) {
        const fileData = await safeApiCall(
          () => getFileContent(owner, repo, entry.path),
          `file ${full_name}/${entry.path}`
        );

        if (!fileData || !fileData.content) continue;

        // Decode base64 content if encoding is base64
        const content = fileData.encoding === 'base64'
          ? decodeBase64(fileData.content)
          : fileData.content;

        files.push({
          full_name,
          path: entry.path,
          size: entry.size,
          sha: fileData.sha,
          content
        });
      }
    }
  }

  const output = {
    fetched_at: new Date().toISOString(),
    total: files.length,
    files
  };

  saveJson(OUTPUT_PATH, output);
  log(`Saved ${files.length} files to ${OUTPUT_PATH}`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchFiles().catch(console.error);
}
