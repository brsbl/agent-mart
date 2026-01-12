import { saveJson, loadJson, ensureDir, log, sanitizeFilename } from '../lib/utils.js';

const INPUT_PATH = './data/06-enriched.json';
const INDEX_PATH = './public/index.json';
const USERS_DIR = './public/users';

/**
 * Generate final public JSON files
 */
export async function output() {
  log('Generating public JSON files...');

  const { users } = loadJson(INPUT_PATH);
  ensureDir(USERS_DIR);

  // Build user summaries for index (sorted by stars)
  const userSummaries = Object.values(users)
    .map(user => ({
      id: user.id,
      display_name: user.display_name,
      type: user.type,
      avatar_url: user.avatar_url,
      url: user.url,
      stats: user.stats
    }))
    .sort((a, b) => b.stats.total_stars - a.stats.total_stars);

  // Calculate totals
  const totals = userSummaries.reduce(
    (acc, o) => ({
      repos: acc.repos + o.stats.total_repos,
      plugins: acc.plugins + o.stats.total_plugins,
      commands: acc.commands + o.stats.total_commands,
      skills: acc.skills + o.stats.total_skills
    }),
    { repos: 0, plugins: 0, commands: 0, skills: 0 }
  );

  // Write index.json
  const indexData = {
    meta: {
      total_users: userSummaries.length,
      total_repos: totals.repos,
      total_plugins: totals.plugins,
      total_commands: totals.commands,
      total_skills: totals.skills,
      generated_at: new Date().toISOString()
    },
    users: userSummaries
  };

  saveJson(INDEX_PATH, indexData);
  log(`Generated ${INDEX_PATH}`);

  // Write per-user files
  for (const user of Object.values(users)) {
    const userData = {
      user: {
        id: user.id,
        display_name: user.display_name,
        type: user.type,
        avatar_url: user.avatar_url,
        url: user.url,
        bio: user.bio,
        stats: user.stats
      },
      repos: user.repos.sort((a, b) => b.signals.stars - a.signals.stars)
    };

    const userPath = `${USERS_DIR}/${sanitizeFilename(user.id)}.json`;
    saveJson(userPath, userData);
  }

  log(`Generated ${Object.keys(users).length} user files in ${USERS_DIR}/`);

  // Summary
  log('');
  log('=== Output Summary ===');
  log(`Users: ${userSummaries.length}`);
  log(`Repos: ${totals.repos}`);
  log(`Plugins: ${totals.plugins}`);
  log(`Commands: ${totals.commands}`);
  log(`Skills: ${totals.skills}`);

  return indexData;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  output().catch(console.error);
}
