import { existsSync } from 'fs';
import { join } from 'path';
import { loadJson, saveJson, log } from './utils.js';

const SIGNALS_HISTORY_PATH = join(process.cwd(), 'data', 'signals-history.json');

// Retain 90 days of history (~13 weeks) for stable z-score calculations
const HISTORY_RETENTION_DAYS = 90;

/**
 * Default empty signals history structure
 */
function createEmptyHistory() {
  return {
    meta: {
      first_snapshot: null,
      last_snapshot: null,
      snapshot_count: 0
    },
    repositories: {}
  };
}

/**
 * Load signals history from disk, returning empty structure if not found
 * @returns {Object} Signals history data
 */
export function loadSignalsHistory() {
  if (!existsSync(SIGNALS_HISTORY_PATH)) {
    log('No signals history found, starting fresh');
    return createEmptyHistory();
  }

  try {
    return loadJson(SIGNALS_HISTORY_PATH);
  } catch (error) {
    log(`Error loading signals history: ${error.message}, starting fresh`);
    return createEmptyHistory();
  }
}

/**
 * Save signals history to disk
 * @param {Object} history - The signals history object to save
 */
export function saveSignalsHistory(history) {
  saveJson(SIGNALS_HISTORY_PATH, history);
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} ISO date string
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a snapshot was already recorded today
 * @param {Object} history - The signals history object
 * @returns {boolean} True if already recorded today
 */
export function hasSnapshotForToday(history) {
  const today = getTodayDate();
  return history.meta.last_snapshot === today;
}

/**
 * Prune snapshots older than the specified number of days
 * @param {Array} snapshots - Array of snapshot objects with date field
 * @param {number} maxAgeDays - Maximum age in days (default 90)
 * @returns {Array} Filtered snapshots
 */
export function pruneOldSnapshots(snapshots, maxAgeDays = HISTORY_RETENTION_DAYS) {
  const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return snapshots.filter(s => new Date(s.date).getTime() > cutoffMs);
}

/**
 * Add a snapshot for a repository
 * @param {Object} history - The signals history object
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {number} stars - Current star count
 * @param {number} forks - Current fork count
 * @param {string} date - Snapshot date (YYYY-MM-DD)
 */
export function addSnapshot(history, repoFullName, stars, forks, date) {
  if (!history.repositories[repoFullName]) {
    history.repositories[repoFullName] = { snapshots: [] };
  }

  history.repositories[repoFullName].snapshots.push({
    date,
    stars,
    forks
  });
}

/**
 * Update meta after recording snapshots
 * @param {Object} history - The signals history object
 * @param {string} date - The snapshot date
 */
export function updateMeta(history, date) {
  history.meta.last_snapshot = date;
  if (!history.meta.first_snapshot) {
    history.meta.first_snapshot = date;
  }
  history.meta.snapshot_count++;
}

export { SIGNALS_HISTORY_PATH };
