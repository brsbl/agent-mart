import { discover } from '../src/pipeline/01-discover.js';
import { fetchRepos } from '../src/pipeline/02-fetch-repos.js';
import { fetchFiles } from '../src/pipeline/04-fetch-files.js';
import { parse } from '../src/pipeline/05-parse.js';
import { enrich } from '../src/pipeline/06-enrich.js';
import { snapshot } from '../src/pipeline/07-snapshot.js';
import { aggregate } from '../src/pipeline/08-aggregate.js';
import { output } from '../src/pipeline/09-output.js';
import { ensureDir, loadJson, log } from '../src/lib/utils.js';

// Pipeline steps configuration (exported for use by visualizer)
export const PIPELINE_STEPS = [
  { name: 'Discover', fn: discover },
  { name: 'Fetch Repos', fn: fetchRepos },
  { name: 'Fetch Files', fn: fetchFiles },
  { name: 'Parse', fn: parse },
  { name: 'Enrich', fn: enrich },
  { name: 'Snapshot', fn: snapshot },
  { name: 'Aggregate', fn: aggregate },
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

  // Pipeline drop summary
  logDropSummary();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log('');
  log('=================================');
  log(`Build completed in ${elapsed}s`);
  log('=================================');
}

/**
 * Load intermediate data files and report repos dropped at each step.
 * Distinguishes expected deletions (404) from unexpected failures.
 */
function logDropSummary() {
  log('');
  log('=== Pipeline Drop Summary ===');

  try {
    const discovered = loadJson('./data/01-discovered.json');
    const repos = loadJson('./data/02-repos.json');
    const enriched = loadJson('./data/06-enriched.json');

    const discoveredCount = discovered.total;
    const fetchedCount = repos.total_repos;
    const enrichedCount = Object.values(enriched.authors).reduce(
      (sum, a) => sum + a.marketplaces.length, 0
    );

    log(`Discovered: ${discoveredCount} repos`);
    log(`Fetched:    ${fetchedCount} repos (${discoveredCount - fetchedCount} dropped)`);
    log(`Enriched:   ${enrichedCount} marketplaces (${fetchedCount - enrichedCount} dropped)`);

    // Collect all drops across steps
    const allDrops = [
      ...(repos.dropped_repos || []).map(d => ({ ...d, step: 'fetch-repos' })),
      ...(enriched.dropped_repos || []).map(d => ({ ...d, step: 'enrich' })),
    ];

    try {
      const filesData = loadJson('./data/04-files.json');
      if (filesData.dropped_repos?.length > 0) {
        allDrops.push(...filesData.dropped_repos.map(d => ({ ...d, step: 'fetch-files' })));
      }
    } catch { /* file may not exist in all flows */ }

    const deletions = allDrops.filter(d => d.reason.includes('404'));
    const failures = allDrops.filter(d => !d.reason.includes('404'));

    if (deletions.length > 0) {
      log(`\nDeleted (expected): ${deletions.length}`);
      for (const d of deletions) {
        log(`  ${d.full_name}`);
      }
    }

    if (failures.length > 0) {
      log(`\nFailed (unexpected): ${failures.length}`);
      for (const f of failures) {
        log(`  [${f.step}] ${f.full_name}: ${f.reason}`);
      }
    }

    if (allDrops.length === 0) {
      log('No repos dropped.');
    }
  } catch {
    log('Could not load pipeline data for drop summary');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}
