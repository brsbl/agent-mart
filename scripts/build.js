import { discover } from '../src/pipeline/01-discover.js';
import { fetchRepos } from '../src/pipeline/02-fetch-repos.js';
import { fetchTrees } from '../src/pipeline/03-fetch-trees.js';
import { fetchFiles } from '../src/pipeline/04-fetch-files.js';
import { parse } from '../src/pipeline/05-parse.js';
import { enrich } from '../src/pipeline/06-enrich.js';
import { output } from '../src/pipeline/07-output.js';
import { ensureDir, log } from '../src/lib/utils.js';

// Pipeline steps configuration (exported for use by visualizer)
export const PIPELINE_STEPS = [
  { name: 'Discover', fn: discover },
  { name: 'Fetch Repos', fn: fetchRepos },
  { name: 'Fetch Trees', fn: fetchTrees },
  { name: 'Fetch Files', fn: fetchFiles },
  { name: 'Parse', fn: parse },
  { name: 'Enrich', fn: enrich },
  { name: 'Output', fn: output }
];

/**
 * Run the full pipeline
 * @param {object} options - Optional configuration
 * @param {function} options.onStageStart - Callback when a stage starts (name, index)
 * @param {function} options.onStageComplete - Callback when a stage completes (name, index, result, duration)
 * @param {function} options.onStageError - Callback when a stage fails (name, index, error)
 */
export async function build(options = {}) {
  const { onStageStart, onStageComplete, onStageError } = options;
  const startTime = Date.now();

  log('=================================');
  log('Agent Mart - Directory Builder');
  log('=================================');
  log('');

  // Ensure data directory exists
  ensureDir('./data');

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i];

    log('');
    log(`>>> Step: ${step.name}`);
    log('-'.repeat(40));

    if (onStageStart) {
      onStageStart(step.name, i);
    }

    const stepStart = Date.now();

    try {
      const result = await step.fn();
      const duration = Date.now() - stepStart;

      if (onStageComplete) {
        onStageComplete(step.name, i, result, duration);
      }
    } catch (error) {
      log(`ERROR in ${step.name}: ${error.message}`);
      console.error(error);

      if (onStageError) {
        onStageError(step.name, i, error);
      }

      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log('');
  log('=================================');
  log(`Build completed in ${elapsed}s`);
  log('=================================');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}
