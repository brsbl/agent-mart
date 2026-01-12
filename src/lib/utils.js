import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensure directory exists, creating it if necessary
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save JSON data to file
 */
export function saveJson(filePath, data) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load JSON data from file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} Parsed JSON data
 * @throws {Error} If file doesn't exist or contains invalid JSON
 */
export function loadJson(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in file: ${filePath} - ${error.message}`);
  }
}

/**
 * Decode base64 string to UTF-8
 */
export function decodeBase64(base64String) {
  return Buffer.from(base64String, 'base64').toString('utf-8');
}

/**
 * Sanitize string for use as filename
 */
export function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Log with timestamp
 */
export function log(message) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Log error with timestamp
 */
export function logError(message, error) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.error(`[${timestamp}] ERROR: ${message}`, error?.message || '');
}
