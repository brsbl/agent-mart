import { saveJson, loadJson, log, logError } from '../lib/utils.js';
import { collectPluginCategories } from '../lib/categorizer.js';
import { DROP_INVALID_MARKETPLACE, DROP_INVALID_FULLNAME } from '../lib/dropReasons.js';

const REPOS_PATH = './data/02-repos.json';
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
 * Deduplicate plugins by name within a marketplace.
 * Keeps the first occurrence of each plugin name.
 * @param {Array} plugins - Array of plugin definitions
 * @param {string} context - Context for logging (e.g., repo full_name)
 * @returns {Array} Deduplicated plugins array
 */
function deduplicatePlugins(plugins, context = '') {
  if (!Array.isArray(plugins)) return [];

  const seen = new Map();
  const deduplicated = [];

  for (const plugin of plugins) {
    const name = plugin?.name;
    if (!name) {
      deduplicated.push(plugin);
      continue;
    }

    if (seen.has(name)) {
      log(`[${context}] Duplicate plugin "${name}" found, keeping first occurrence`);
    } else {
      seen.set(name, plugin);
      deduplicated.push(plugin);
    }
  }

  return deduplicated;
}

/**
 * Build enriched data model
 */
export function enrich({ onProgress: _onProgress } = {}) {
  log('Starting data enrichment...');

  const reposData = loadJson(REPOS_PATH);
  const parsedData = loadJson(PARSED_PATH);

  // Build maps for O(1) lookups
  const marketplaceMap = new Map(
    parsedData.marketplaces.map(m => [m.full_name, m])
  );

  // Files are now indexed by repo full_name
  const filesMap = parsedData.files || {};

  const enrichedAuthors = new Map();
  const dropped = [];

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
      dropped.push({ full_name, reason: DROP_INVALID_MARKETPLACE });
      continue;
    }

    // Get files for this repo
    const repoFiles = filesMap[full_name] || {};

    // Build plugins array
    const marketplaceData = marketplace.data;

    if (!full_name || !full_name.includes('/')) {
      log(`Invalid full_name: ${full_name}, skipping`);
      dropped.push({ full_name: full_name || '(empty)', reason: DROP_INVALID_FULLNAME });
      continue;
    }

    const marketplaceName = marketplaceData.name || full_name.split('/')[1];

    // Deduplicate plugins by name (handles duplicate entries in source marketplace.json)
    const rawPlugins = marketplaceData.plugins || [];
    const uniquePlugins = deduplicatePlugins(rawPlugins, full_name);

    const plugins = uniquePlugins.map(pluginDef => {
      // Collect categories from all source fields with basic normalization
      const categories = collectPluginCategories(pluginDef);

      // Preserve all original fields from marketplace.json, add/override computed fields
      return {
        ...pluginDef,
        // Ensure description is normalized (null if missing)
        description: pluginDef.description || null,
        categories,
        install_commands: generateInstallCommands(full_name, marketplaceName, pluginDef.name)
      };
    });

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
      files: repoFiles,
      plugins
    };

    // Update author stats
    authorData.stats.total_marketplaces++;
    authorData.stats.total_plugins += plugins.length;
    authorData.stats.total_stars += (repo.repo.signals?.stars || 0);
    authorData.stats.total_forks += (repo.repo.signals?.forks || 0);

    authorData.marketplaces.push(marketplaceEntry);
  }

  if (dropped.length > 0) {
    log(`Dropped ${dropped.length}/${reposData.repos.length} repos: ${dropped.map(d => d.full_name).join(', ')}`);
  }

  const output = {
    enriched_at: new Date().toISOString(),
    total_authors: enrichedAuthors.size,
    dropped_repos: dropped,
    authors: Object.fromEntries(enrichedAuthors)
  };

  saveJson(OUTPUT_PATH, output);
  log(`Enriched ${enrichedAuthors.size} authors with full data`);

  return output;
}

// Export helper functions for testing
export {
  generateInstallCommands,
  deduplicatePlugins
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    enrich();
  } catch (error) {
    logError('Enrichment error', error);
  }
}
