import { normalizeSourcePath } from '../lib/parser.js';
import { saveJson, loadJson, log } from '../lib/utils.js';
import { normalizeCategory } from '../lib/categories.js';

const REPOS_PATH = './data/02-repos.json';
const TREES_PATH = './data/03-trees.json';
const PARSED_PATH = './data/05-parsed.json';
const CATEGORIES_PATH = './data/marketplace-categories.json';
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
 * Check if a file path belongs to a plugin
 */
function pathBelongsToPlugin(filePath, pluginSource) {
  const normalizedSource = normalizeSourcePath(pluginSource);
  if (!normalizedSource) return false;
  return filePath.startsWith(normalizedSource + '/') || filePath === normalizedSource;
}

/**
 * Build enriched data model
 */
export function enrich() {
  log('Starting data enrichment...');

  const reposData = loadJson(REPOS_PATH);
  const treesData = loadJson(TREES_PATH);
  const parsedData = loadJson(PARSED_PATH);

  // Load marketplace categories (pre-generated)
  let categoriesData = { marketplaces: {} };
  try {
    categoriesData = loadJson(CATEGORIES_PATH);
    log(`Loaded categories for ${Object.keys(categoriesData.marketplaces).length} marketplaces`);
  } catch {
    log('Warning: marketplace-categories.json not found, marketplaces will have no categories');
  }

  // Build maps for O(1) lookups
  const marketplaceMap = new Map(
    parsedData.marketplaces.map(m => [m.full_name, m])
  );
  const treeMap = new Map(
    treesData.trees.map(t => [t.full_name, t])
  );

  // Pre-index commands by repo for O(1) lookup (fixes O(n²) scaling issue)
  const commandsByRepo = new Map();
  for (const cmd of parsedData.commands) {
    if (!commandsByRepo.has(cmd.full_name)) {
      commandsByRepo.set(cmd.full_name, []);
    }
    commandsByRepo.get(cmd.full_name).push(cmd);
  }

  // Pre-index skills by repo for O(1) lookup
  const skillsByRepo = new Map();
  for (const skill of parsedData.skills) {
    if (!skillsByRepo.has(skill.full_name)) {
      skillsByRepo.set(skill.full_name, []);
    }
    skillsByRepo.get(skill.full_name).push(skill);
  }

  log(`Indexed ${parsedData.commands.length} commands and ${parsedData.skills.length} skills`);

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

    // Build plugins array
    const marketplaceData = marketplace.data;

    if (!full_name || !full_name.includes('/')) {
      log(`Invalid full_name: ${full_name}, skipping`);
      continue;
    }

    const marketplaceName = marketplaceData.name || full_name.split('/')[1];

    const plugins = (marketplaceData.plugins || []).map(pluginDef => {
      const pluginSource = pluginDef.source || '';

      // Find commands for this plugin (O(1) repo lookup + filter within repo)
      const repoCommands = commandsByRepo.get(full_name) || [];
      const commands = repoCommands
        .filter(c => pathBelongsToPlugin(c.path, pluginSource))
        .map(c => ({
          name: c.name,
          description: c.description,
          path: c.path,
          frontmatter: c.frontmatter,
          content: c.content
        }));

      // Find skills for this plugin (O(1) repo lookup + filter within repo)
      const repoSkills = skillsByRepo.get(full_name) || [];
      const skills = repoSkills
        .filter(s => pathBelongsToPlugin(s.path, pluginSource))
        .map(s => ({
          name: s.name,
          description: s.description,
          path: s.path,
          frontmatter: s.frontmatter,
          content: s.content
        }));

      return {
        name: pluginDef.name,
        description: pluginDef.description || null,
        source: pluginDef.source,
        category: normalizeCategory(
          pluginDef.category,
          pluginDef.description || marketplaceData.description || '',
          marketplaceData.keywords || []
        ),
        version: pluginDef.version || null,
        author: pluginDef.author || null,
        install_commands: generateInstallCommands(full_name, marketplaceName, pluginDef.name),
        signals: repo.repo.signals,
        commands,
        skills
      };
    });

    // Get marketplace categories from pre-generated data
    // Supports both legacy array format and new object format with hash
    const repoKey = `${ownerInfo.id}/${marketplaceName}`;
    const categoryEntry = categoriesData.marketplaces[repoKey] ||
                          categoriesData.marketplaces[full_name];
    const marketplaceCategories = Array.isArray(categoryEntry)
      ? categoryEntry
      : (categoryEntry?.categories || ['productivity-tools']);

    // Build marketplace entry (merged repo + marketplace fields)
    const marketplaceEntry = {
      name: marketplaceName,
      version: marketplaceData.version || null,
      description: marketplaceData.description || null,
      owner_info: marketplaceData.owner || null,
      keywords: marketplaceData.keywords || [],
      categories: marketplaceCategories,
      repo_full_name: full_name,
      repo_url: `https://github.com/${full_name}`,
      repo_description: repo.repo.description,
      homepage: repo.repo.homepage,
      signals: repo.repo.signals,
      file_tree: tree,
      plugins
    };

    // Update author stats
    authorData.stats.total_marketplaces++;
    authorData.stats.total_plugins += plugins.length;
    authorData.stats.total_commands += plugins.reduce((sum, p) => sum + p.commands.length, 0);
    authorData.stats.total_skills += plugins.reduce((sum, p) => sum + p.skills.length, 0);
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

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    enrich();
  } catch (error) {
    console.error(error);
  }
}
