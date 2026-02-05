import { loadJson, log, logError } from '../lib/utils.js';
import {
  loadSignalsHistory,
  saveSignalsHistory,
  getSnapshotTimestamp,
  pruneOldSnapshots,
  addSnapshot,
  updateMeta
} from '../lib/signalsHistory.js';

const INPUT_PATH = './data/06-enriched.json';

/**
 * Record a snapshot of current star/fork counts for trending calculation
 *
 * This step:
 * 1. Loads current enriched data with star/fork counts
 * 2. Loads or initializes signals history
 * 3. Records snapshot for each marketplace (multiple per day supported)
 * 4. Prunes old snapshots (>90 days)
 * 5. Saves updated history
 */
export function snapshot({ onProgress: _onProgress } = {}) {
  log('Recording signals snapshot...');

  // Load enriched data
  const enriched = loadJson(INPUT_PATH);
  const history = loadSignalsHistory();
  const timestamp = getSnapshotTimestamp();

  let repoCount = 0;
  let withStars = 0;
  let withForks = 0;

  // Iterate through all marketplaces and record snapshots
  for (const author of Object.values(enriched.authors || {})) {
    for (const marketplace of author.marketplaces || []) {
      const repoFullName = marketplace.repo_full_name;
      if (!repoFullName) continue;

      const stars = marketplace.signals?.stars ?? 0;
      const forks = marketplace.signals?.forks ?? 0;

      if (stars > 0) withStars++;
      if (forks > 0) withForks++;

      // Add the snapshot
      addSnapshot(history, repoFullName, stars, forks, timestamp);

      // Prune old snapshots for this repo
      history.repositories[repoFullName].snapshots = pruneOldSnapshots(
        history.repositories[repoFullName].snapshots
      );

      repoCount++;
    }
  }

  // Prune orphaned repositories (no longer in enriched data)
  const currentRepos = new Set();
  for (const author of Object.values(enriched.authors || {})) {
    for (const marketplace of author.marketplaces || []) {
      if (marketplace.repo_full_name) {
        currentRepos.add(marketplace.repo_full_name);
      }
    }
  }
  let prunedCount = 0;
  for (const repo of Object.keys(history.repositories)) {
    if (!currentRepos.has(repo)) {
      delete history.repositories[repo];
      prunedCount++;
    }
  }
  if (prunedCount > 0) {
    log(`Pruned ${prunedCount} orphaned repositories from history`);
  }

  // Update metadata
  updateMeta(history, timestamp);

  // Save the updated history
  saveSignalsHistory(history);

  log(`Recorded snapshot for ${repoCount} repositories`);
  log(`History now contains ${history.meta.snapshot_count} snapshots`);

  return {
    timestamp,
    repo_count: repoCount,
    with_stars: withStars,
    with_forks: withForks
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    snapshot();
  } catch (error) {
    logError('Snapshot error', error);
  }
}
