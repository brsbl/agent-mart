import { discover } from '../src/pipeline/01-discover.js';
import { fetchRepos } from '../src/pipeline/02-fetch-repos.js';
import { fetchTrees } from '../src/pipeline/03-fetch-trees.js';
import { fetchFiles } from '../src/pipeline/04-fetch-files.js';
import { parse } from '../src/pipeline/05-parse.js';
import { enrich } from '../src/pipeline/06-enrich.js';
import { output } from '../src/pipeline/07-output.js';
import { ensureDir, log } from '../src/lib/utils.js';

/**
 * Run the full pipeline
 */
async function build() {
  const startTime = Date.now();

  log('=================================');
  log('Agent Mart - Directory Builder');
  log('=================================');
  log('');

  // Ensure data directory exists
  ensureDir('./data');

  // Run pipeline steps
  const steps = [
    { name: 'Discover', fn: discover },
    { name: 'Fetch Repos', fn: fetchRepos },
    { name: 'Fetch Trees', fn: fetchTrees },
    { name: 'Fetch Files', fn: fetchFiles },
    { name: 'Parse', fn: parse },
    { name: 'Enrich', fn: enrich },
    { name: 'Output', fn: output }
  ];

  for (const step of steps) {
    log('');
    log(`>>> Step: ${step.name}`);
    log('-'.repeat(40));

    try {
      await step.fn();
    } catch (error) {
      log(`ERROR in ${step.name}: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log('');
  log('=================================');
  log(`Build completed in ${elapsed}s`);
  log('=================================');
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
