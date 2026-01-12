import { normalizeSourcePath } from '../lib/parser.js';
import { saveJson, loadJson, log } from '../lib/utils.js';

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
 * Check if a file path belongs to a plugin
 */
function pathBelongsToPlugin(filePath, pluginSource) {
  const normalizedSource = normalizeSourcePath(pluginSource);
  return filePath.startsWith(normalizedSource + '/') || filePath.startsWith(normalizedSource);
}

/**
 * Build enriched data model
 */
export async function enrich() {
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

  const enrichedOwners = new Map();

  for (const repo of reposData.repos) {
    const { full_name, owner: ownerInfo } = repo;

    // Get or create owner entry
    if (!enrichedOwners.has(ownerInfo.id)) {
      const ownerProfile = reposData.owners[ownerInfo.id] || {};
      enrichedOwners.set(ownerInfo.id, {
        id: ownerInfo.id,
        display_name: ownerProfile.display_name || ownerInfo.id,
        type: ownerInfo.type,
        avatar_url: ownerInfo.avatar_url,
        url: ownerProfile.url || `https://github.com/${ownerInfo.id}`,
        bio: ownerProfile.bio || null,
        stats: {
          total_repos: 0,
          total_plugins: 0,
          total_commands: 0,
          total_skills: 0,
          total_stars: 0,
          total_forks: 0
        },
        repos: []
      });
    }

    const ownerData = enrichedOwners.get(ownerInfo.id);

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
        category: pluginDef.category || null,
        version: pluginDef.version || null,
        author: pluginDef.author || null,
        install_commands: generateInstallCommands(full_name, marketplaceName, pluginDef.name),
        signals: repo.repo.signals,
        commands,
        skills
      };
    });

    // Build repo entry
    const repoEntry = {
      full_name,
      url: `https://github.com/${full_name}`,
      description: repo.repo.description,
      homepage: repo.repo.homepage,
      signals: repo.repo.signals,
      file_tree: tree,
      marketplace: {
        name: marketplaceName,
        version: marketplaceData.version || null,
        description: marketplaceData.description || null,
        owner_info: marketplaceData.owner || null,
        keywords: marketplaceData.keywords || [],
        plugins
      }
    };

    // Update user stats
    ownerData.stats.total_repos++;
    ownerData.stats.total_plugins += plugins.length;
    ownerData.stats.total_commands += plugins.reduce((sum, p) => sum + p.commands.length, 0);
    ownerData.stats.total_skills += plugins.reduce((sum, p) => sum + p.skills.length, 0);
    ownerData.stats.total_stars += repo.repo.signals.stars;
    ownerData.stats.total_forks += repo.repo.signals.forks;

    ownerData.repos.push(repoEntry);
  }

  const output = {
    enriched_at: new Date().toISOString(),
    total_owners: enrichedOwners.size,
    owners: Object.fromEntries(enrichedOwners)
  };

  saveJson(OUTPUT_PATH, output);
  log(`Enriched ${enrichedOwners.size} owners with full data`);

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enrich().catch(console.error);
}
