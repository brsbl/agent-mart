import { loadJson, log, logError } from '../lib/utils.js';
import {
  loadSignalsHistory,
  saveSignalsHistory,
  getTodayDate,
  hasSnapshotForToday,
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
 * 3. Skips if already recorded today
 * 4. Records snapshot for each marketplace
 * 5. Prunes old snapshots (>90 days)
 * 6. Saves updated history
 */
export function snapshot({ onProgress: _onProgress } = {}) {
  log('Recording signals snapshot...');

  // Load enriched data
  const enriched = loadJson(INPUT_PATH);
  const history = loadSignalsHistory();
  const today = getTodayDate();

  // Skip if already recorded today
  if (hasSnapshotForToday(history)) {
    log('Snapshot already recorded for today, skipping');
    return {
      skipped: true,
      date: today,
      repo_count: Object.keys(history.repositories).length,
      snapshot_count: history.meta.snapshot_count
    };
  }

  let repoCount = 0;

  // Iterate through all marketplaces and record snapshots
  for (const author of Object.values(enriched.authors || {})) {
    for (const marketplace of author.marketplaces || []) {
      const repoFullName = marketplace.repo_full_name;
      if (!repoFullName) continue;

      const stars = marketplace.signals?.stars ?? 0;
      const forks = marketplace.signals?.forks ?? 0;

      // Add the snapshot
      addSnapshot(history, repoFullName, stars, forks, today);

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
  updateMeta(history, today);

  // Save the updated history
  saveSignalsHistory(history);

  log(`Recorded snapshot for ${repoCount} repositories`);
  log(`History now contains ${history.meta.snapshot_count} snapshots`);

  return {
    skipped: false,
    date: today,
    repo_count: repoCount,
    snapshot_count: history.meta.snapshot_count
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
