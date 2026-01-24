import { batchGetFiles } from '../lib/github.js';
import { saveJson, loadJson, log, applyRepoLimit } from '../lib/utils.js';
import { parseJson } from '../lib/parser.js';

const TREES_PATH = './data/03-trees.json';
const OUTPUT_PATH = './data/04-files.json';

// Maximum file size to fetch (100KB)
const MAX_FILE_SIZE = 100000;

// File extensions to skip (binary/large files)
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib',
  '.lock'
]);

/**
 * Check if file should be skipped based on extension/size
 */
function shouldSkipFile(entry) {
  if (entry.type !== 'blob') return true;
  if (typeof entry.size === 'number' && entry.size > MAX_FILE_SIZE) return true;

  const ext = entry.path.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && SKIP_EXTENSIONS.has(ext)) return true;

  return false;
}

/**
 * Check if a path is within a directory (handles ./ prefix)
 */
function isWithinDirectory(filePath, dirPath) {
  // Normalize dirPath - remove leading ./ and trailing /
  const normalizedDir = dirPath.replace(/^\.\//, '').replace(/\/$/, '');

  // Handle root directory case - all files are within root; let isPluginComponentFile filter
  if (normalizedDir === '.' || normalizedDir === '') {
    return true;
  }

  return filePath.startsWith(normalizedDir + '/') || filePath === normalizedDir;
}

/**
 * Check if a file is a plugin component (skills, commands, agents, hooks, plugin.json)
 * We only fetch these files, not arbitrary source code
 */
function isPluginComponentFile(path) {
  // .claude-plugin/ files (plugin.json, etc.)
  if (path.includes('.claude-plugin/')) return true;

  // SKILL.md files (skills/<name>/SKILL.md or just SKILL.md)
  if (path.endsWith('/SKILL.md') || path === 'SKILL.md') return true;

  // Commands (commands/*.md) - handle both nested and root-level
  if ((path.includes('/commands/') || path.startsWith('commands/')) && path.endsWith('.md')) return true;

  // Agents (agents/*.md) - handle both nested and root-level
  if ((path.includes('/agents/') || path.startsWith('agents/')) && path.endsWith('.md')) return true;

  // Hooks directory (hooks/**) - handle both nested and root-level
  if (path.includes('/hooks/') || path.startsWith('hooks/')) return true;

  // Skills directory markdown files - handle both nested and root-level
  if ((path.includes('/skills/') || path.startsWith('skills/')) && path.endsWith('.md')) return true;

  return false;
}

/**
 * Extract plugin source paths from marketplace.json content
 */
function extractPluginSourcePaths(marketplaceContent) {
  const data = parseJson(marketplaceContent, 'marketplace.json');
  if (!data || !Array.isArray(data.plugins)) return [];

  const paths = [];
  for (const plugin of data.plugins) {
    if (!plugin.source) continue;

    // Handle string source (local path)
    if (typeof plugin.source === 'string') {
      paths.push(plugin.source);
    }
    // Handle object source with path property
    else if (typeof plugin.source === 'object' && plugin.source.path) {
      paths.push(plugin.source.path);
    }
    // Skip URL-based sources (source.source === 'url')
  }

  return paths;
}

/**
 * Two-pass file fetching:
 * 1. First fetch .claude-plugin/ files (including marketplace.json)
 * 2. Parse marketplace.json to find plugin source paths
 * 3. Fetch files from those source directories
 */
export async function fetchFiles({ onProgress } = {}) {
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
    const branch = default_branch || 'main';

    onProgress?.(i + 1, reposToProcess.length);

    // Pass 1: Find and fetch .claude-plugin/ files
    const claudePluginFiles = tree.filter(entry =>
      !shouldSkipFile(entry) && entry.path.startsWith('.claude-plugin/')
    );

    if (claudePluginFiles.length === 0) {
      log(`[${i + 1}/${reposToProcess.length}] ${full_name}: no .claude-plugin/ files`);
      continue;
    }

    // Fetch .claude-plugin/ files
    const pass1Paths = claudePluginFiles.map(e => e.path);
    let pass1Results = {};

    try {
      pass1Results = await batchGetFiles(owner, repo, branch, pass1Paths);
    } catch (error) {
      log(`Batch failed for ${full_name} pass 1: ${error.message}`);
      continue;
    }

    // Store fetched files and find marketplace.json
    let marketplaceContent = null;
    for (const entry of claudePluginFiles) {
      const fileData = pass1Results[entry.path];
      if (fileData && fileData.content) {
        files.push({
          full_name,
          path: entry.path,
          size: fileData.size || entry.size,
          sha: null,
          content: fileData.content
        });

        if (entry.path.endsWith('marketplace.json')) {
          marketplaceContent = fileData.content;
        }
      }
    }

    // Pass 2: Parse marketplace.json and fetch plugin source directories
    if (marketplaceContent) {
      const sourcePaths = extractPluginSourcePaths(marketplaceContent);

      if (sourcePaths.length > 0) {
        // Find plugin component files in source directories (only skills, commands, agents, hooks)
        const sourceFiles = tree.filter(entry => {
          if (shouldSkipFile(entry)) return false;
          if (entry.path.startsWith('.claude-plugin/')) return false;

          // Must be within a plugin source directory
          const inSourceDir = sourcePaths.some(srcPath => isWithinDirectory(entry.path, srcPath));
          if (!inSourceDir) return false;

          // Only fetch plugin component files, not arbitrary source code
          return isPluginComponentFile(entry.path);
        });

        if (sourceFiles.length > 0) {
          const pass2Paths = sourceFiles.map(e => e.path);

          try {
            const pass2Results = await batchGetFiles(owner, repo, branch, pass2Paths);

            for (const entry of sourceFiles) {
              const fileData = pass2Results[entry.path];
              if (fileData && fileData.content) {
                files.push({
                  full_name,
                  path: entry.path,
                  size: fileData.size || entry.size,
                  sha: null,
                  content: fileData.content
                });
              }
            }

            log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${pass1Paths.length} + ${pass2Paths.length} files`);
          } catch (error) {
            log(`Batch failed for ${full_name} pass 2: ${error.message}`);
            log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${pass1Paths.length} files`);
          }
        } else {
          log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${pass1Paths.length} files`);
        }
      } else {
        log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${pass1Paths.length} files`);
      }
    } else {
      log(`[${i + 1}/${reposToProcess.length}] ${full_name}: fetching ${pass1Paths.length} files (no marketplace.json)`);
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
