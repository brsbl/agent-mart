import { saveJson, loadJson, log } from '../lib/utils.js';
import { extractPluginCategories } from '../lib/categorizer.js';

const REPOS_PATH = './data/02-repos.json';
const TREES_PATH = './data/03-trees.json';
const PARSED_PATH = './data/05-parsed.json';
const OUTPUT_PATH = './data/06-enriched.json';

/**
 * Generate install commands for a plugin
 */
function generateInstallCommands(ownerRepo, marketplaceName, pluginName) {
  return [
    `/plugin marketplace add ${ownerRepo}`,
    `/plugin install ${pluginName}@${marketplaceName}`
  ];
}

/**
 * Count commands in a file map (files matching commands/*.md pattern)
 */
function countCommands(files) {
  if (!files) return 0;
  return Object.keys(files).filter(path =>
    (path.startsWith('commands/') || path.includes('/commands/')) && path.endsWith('.md')
  ).length;
}

/**
 * Count skills in a file map (files ending with /SKILL.md)
 */
function countSkills(files) {
  if (!files) return 0;
  return Object.keys(files).filter(path =>
    path === 'SKILL.md' || path.endsWith('/SKILL.md')
  ).length;
}

/**
 * Filter file tree to only include files we have content for
 * Keeps directory entries that have at least one file descendant
 */
function filterTreeToFetchedFiles(tree, files) {
  const fetchedPaths = new Set(Object.keys(files));

  // First pass: identify which directories have fetched files
  const dirsWithContent = new Set();
  for (const path of fetchedPaths) {
    const parts = path.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i];
      dirsWithContent.add(current);
    }
  }

  // Second pass: filter tree entries
  return tree.filter(entry => {
    if (entry.type === 'blob') {
      return fetchedPaths.has(entry.path);
    }
    // Keep directory if it contains fetched files
    return dirsWithContent.has(entry.path);
  });
}

/**
 * Build enriched data model
 */
export function enrich({ onProgress: _onProgress } = {}) {
  log('Starting data enrichment...');

  const reposData = loadJson(REPOS_PATH);
  const treesData = loadJson(TREES_PATH);
  const parsedData = loadJson(PARSED_PATH);

  // Build maps for O(1) lookups
  const marketplaceMap = new Map(
    parsedData.marketplaces.map(m => [m.full_name, m])
  );
  const treeMap = new Map(
    treesData.trees.map(t => [t.full_name, t])
  );

  // Files are now indexed by repo full_name
  const filesMap = parsedData.files || {};

  const enrichedAuthors = new Map();

  for (const repo of reposData.repos) {
    const { full_name, owner: ownerInfo } = repo;

    // Get or create author entry
    if (!enrichedAuthors.has(ownerInfo.id)) {
      const ownerProfile = reposData.owners[ownerInfo.id] || {};
      enrichedAuthors.set(ownerInfo.id, {
        id: ownerInfo.id,
        display_name: ownerProfile.display_name || ownerInfo.id,
        type: ownerInfo.type,
        avatar_url: ownerInfo.avatar_url,
        url: ownerProfile.url || `https://github.com/${ownerInfo.id}`,
        bio: ownerProfile.bio || null,
        stats: {
          total_marketplaces: 0,
          total_plugins: 0,
          total_commands: 0,
          total_skills: 0,
          total_stars: 0,
          total_forks: 0
        },
        marketplaces: []
      });
    }

    const authorData = enrichedAuthors.get(ownerInfo.id);

    // Find marketplace.json for this repo
    const marketplace = marketplaceMap.get(full_name);
    if (!marketplace) {
      log(`No marketplace.json found for ${full_name}, skipping`);
      continue;
    }

    // Find tree for this repo
    const treeEntry = treeMap.get(full_name);
    const tree = treeEntry?.tree || [];

    // Get files for this repo
    const repoFiles = filesMap[full_name] || {};

    // Build plugins array
    const marketplaceData = marketplace.data;

    if (!full_name || !full_name.includes('/')) {
      log(`Invalid full_name: ${full_name}, skipping`);
      continue;
    }

    const marketplaceName = marketplaceData.name || full_name.split('/')[1];

    const plugins = (marketplaceData.plugins || []).map(pluginDef => {
      // Build plugin object for categorization (using available data)
      const pluginForCategorization = {
        name: pluginDef.name,
        description: pluginDef.description || null,
        commands: [],
        skills: []
      };

      // Extract categories for this plugin
      const categories = extractPluginCategories(pluginForCategorization);

      // Preserve all original fields from marketplace.json, add/override computed fields
      return {
        ...pluginDef,
        // Ensure description is normalized (null if missing)
        description: pluginDef.description || null,
        categories,
        install_commands: generateInstallCommands(full_name, marketplaceName, pluginDef.name)
      };
    });

    // Count commands and skills from file paths
    const commandsCount = countCommands(repoFiles);
    const skillsCount = countSkills(repoFiles);

    // Get description: marketplace level > first plugin description > null
    const firstPluginDescription = marketplaceData.plugins?.[0]?.description || null;
    const description = marketplaceData.description ||
                       marketplaceData.metadata?.description ||
                       firstPluginDescription;

    // Build marketplace entry (merged repo + marketplace fields)
    const marketplaceEntry = {
      name: marketplaceName,
      version: marketplaceData.version || null,
      description,
      owner_info: marketplaceData.owner || null,
      keywords: marketplaceData.keywords || [],
      repo_full_name: full_name,
      repo_url: `https://github.com/${full_name}`,
      repo_description: repo.repo.description,
      homepage: repo.repo.homepage,
      signals: repo.repo.signals,
      file_tree: filterTreeToFetchedFiles(tree, repoFiles),
      files: repoFiles,
      plugins
    };

    // Update author stats
    authorData.stats.total_marketplaces++;
    authorData.stats.total_plugins += plugins.length;
    authorData.stats.total_commands += commandsCount;
    authorData.stats.total_skills += skillsCount;
    authorData.stats.total_stars += (repo.repo.signals?.stars || 0);
    authorData.stats.total_forks += (repo.repo.signals?.forks || 0);

    authorData.marketplaces.push(marketplaceEntry);
  }

  const output = {
    enriched_at: new Date().toISOString(),
    total_authors: enrichedAuthors.size,
    authors: Object.fromEntries(enrichedAuthors)
  };

  saveJson(OUTPUT_PATH, output);
  log(`Enriched ${enrichedAuthors.size} authors with full data`);

  return output;
}

// Export helper functions for testing
export {
  generateInstallCommands,
  countCommands,
  countSkills,
  filterTreeToFetchedFiles
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    enrich();
  } catch (error) {
    console.error(error);
  }
}
