import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';
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
  if (!resolved.startsWith(cacheDir + sep) && resolved !== cacheDir) {
    throw new Error('Path traversal detected in cache path');
  }
  return resolved;
}

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
