import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { log } from './utils.js';

const CACHE_DIR = './data/.cache';

// Forbidden cache IDs to prevent prototype pollution
const FORBIDDEN_IDS = ['__proto__', 'constructor', 'prototype'];

/**
 * Validate that a cache file path stays within CACHE_DIR
 * @param {string} filepath - Path to validate
 * @returns {string} Resolved path if valid
 * @throws {Error} If path traversal detected
 */
function validateCachePath(filepath) {
  const resolved = resolve(filepath);
  const cacheDir = resolve(CACHE_DIR);
  if (!resolved.startsWith(cacheDir + '/') && resolved !== cacheDir) {
    throw new Error('Path traversal detected in cache path');
  }
  return resolved;
}

// Cache TTLs
const TTL = {
  OWNER: 24 * 60 * 60 * 1000, // 24 hours for owner profiles
  TREE: 0 // Trees are cached by SHA, which is immutable (no TTL needed)
};

/**
 * Ensure cache directory exists
 */
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate a safe cache key from an identifier
 * @param {string} prefix - Cache prefix (e.g., 'user', 'tree')
 * @param {string} id - Identifier
 * @returns {string} Safe filename
 * @throws {Error} If id is a forbidden prototype pollution vector
 */
function cacheKey(prefix, id) {
  // Prevent prototype pollution attacks
  if (FORBIDDEN_IDS.includes(id.toLowerCase())) {
    throw new Error(`Forbidden cache id: ${id}`);
  }
  if (FORBIDDEN_IDS.includes(prefix.toLowerCase())) {
    throw new Error(`Forbidden cache prefix: ${prefix}`);
  }

  // Replace special characters with underscores
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}_${safeId}.json`;
}

/**
 * Get cached data if valid
 * @param {string} prefix - Cache prefix
 * @param {string} id - Identifier
 * @param {number} maxAgeMs - Maximum age in milliseconds (0 = no expiry)
 * @returns {Object|null} Cached data or null if not found/expired
 */
export function getCached(prefix, id, maxAgeMs = 0) {
  ensureCacheDir();
  const filepath = validateCachePath(join(CACHE_DIR, cacheKey(prefix, id)));

  if (!existsSync(filepath)) {
    return null;
  }

  try {
    const stat = statSync(filepath);
    const age = Date.now() - stat.mtimeMs;

    // Check if expired (0 = never expires)
    if (maxAgeMs > 0 && age > maxAgeMs) {
      log(`Cache expired: ${prefix}/${id} (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    const data = JSON.parse(readFileSync(filepath, 'utf-8'));
    log(`Cache hit: ${prefix}/${id}`);
    return data;
  } catch (_error) {
    return null;
  }
}

/**
 * Save data to cache
 * @param {string} prefix - Cache prefix
 * @param {string} id - Identifier
 * @param {Object} data - Data to cache
 */
export function setCache(prefix, id, data) {
  ensureCacheDir();
  const filepath = validateCachePath(join(CACHE_DIR, cacheKey(prefix, id)));

  try {
    writeFileSync(filepath, JSON.stringify(data), 'utf-8');
  } catch (error) {
    log(`Cache write error: ${prefix}/${id}: ${error.message}`);
  }
}

// Utility functions for cache management (manual/debugging use)

/**
 * Check if cache entry exists and is valid
 * @param {string} prefix - Cache prefix
 * @param {string} id - Identifier
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {boolean} True if valid cache exists
 */
export function isCacheValid(prefix, id, maxAgeMs = 0) {
  return getCached(prefix, id, maxAgeMs) !== null;
}

/**
 * Delete a cache entry
 * @param {string} prefix - Cache prefix
 * @param {string} id - Identifier
 */
export function deleteCache(prefix, id) {
  const filepath = validateCachePath(join(CACHE_DIR, cacheKey(prefix, id)));
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
}

/**
 * Clear all cache entries with a given prefix
 * @param {string} prefix - Cache prefix to clear
 * @throws {Error} If prefix is a forbidden prototype pollution vector
 */
export function clearCachePrefix(prefix) {
  if (FORBIDDEN_IDS.includes(prefix.toLowerCase())) {
    throw new Error(`Forbidden cache prefix: ${prefix}`);
  }
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR);
  let cleared = 0;

  for (const file of files) {
    if (file.startsWith(`${prefix}_`)) {
      unlinkSync(join(CACHE_DIR, file));
      cleared++;
    }
  }

  if (cleared > 0) {
    log(`Cleared ${cleared} cache entries with prefix: ${prefix}`);
  }
}

/**
 * Clear all expired cache entries
 * @param {Object} ttls - Map of prefix to TTL in ms
 */
export function clearExpiredCache(ttls = TTL) {
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR);
  let cleared = 0;

  for (const file of files) {
    const filepath = join(CACHE_DIR, file);
    const stat = statSync(filepath);
    const age = Date.now() - stat.mtimeMs;

    // Check each known prefix
    for (const [prefix, maxAgeMs] of Object.entries(ttls)) {
      if (file.startsWith(`${prefix}_`) && maxAgeMs > 0 && age > maxAgeMs) {
        unlinkSync(filepath);
        cleared++;
        break;
      }
    }
  }

  if (cleared > 0) {
    log(`Cleared ${cleared} expired cache entries`);
  }
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR);
  const stats = {
    total: files.length,
    byPrefix: {},
    totalSizeBytes: 0
  };

  for (const file of files) {
    const filepath = join(CACHE_DIR, file);
    const fileStat = statSync(filepath);
    stats.totalSizeBytes += fileStat.size;

    // Extract prefix
    const prefix = file.split('_')[0];
    stats.byPrefix[prefix] = (stats.byPrefix[prefix] || 0) + 1;
  }

  return stats;
}

// Export TTL constants for use in other modules
export { TTL };
