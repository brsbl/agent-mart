import { log, logError } from './utils.js';

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - List of validation errors
 * @property {string[]} warnings - List of validation warnings
 */

/**
 * Validate marketplace.json per Claude Code spec
 * Required: name, plugins array where each plugin has name + source
 * @param {Object} data - Parsed marketplace.json data
 * @param {string} context - Context for error messages (e.g., repo full_name)
 * @returns {ValidationResult}
 */
export function validateMarketplace(data, context = '') {
  const errors = [];
  const warnings = [];
  const prefix = context ? `[${context}] ` : '';

  if (!data || typeof data !== 'object') {
    errors.push(`${prefix}marketplace.json must be a valid JSON object`);
    return { valid: false, errors, warnings };
  }

  // Required: name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push(`${prefix}marketplace.json requires "name" field (non-empty string)`);
  }

  // Required: plugins array
  if (!Array.isArray(data.plugins)) {
    errors.push(`${prefix}marketplace.json requires "plugins" field (array)`);
    return { valid: errors.length === 0, errors, warnings };
  }

  if (data.plugins.length === 0) {
    warnings.push(`${prefix}marketplace.json has empty plugins array`);
  }

  // Validate each plugin entry
  data.plugins.forEach((plugin, index) => {
    const pluginContext = `${prefix}plugins[${index}]`;

    if (!plugin || typeof plugin !== 'object') {
      errors.push(`${pluginContext}: must be an object`);
      return;
    }

    // Required: name
    if (!plugin.name || typeof plugin.name !== 'string' || plugin.name.trim() === '') {
      errors.push(`${pluginContext}: requires "name" field (non-empty string)`);
    }

    // Required: source
    if (!plugin.source) {
      errors.push(`${pluginContext}: requires "source" field`);
    } else if (typeof plugin.source !== 'string' && typeof plugin.source !== 'object') {
      errors.push(`${pluginContext}: "source" must be a string or object`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate plugin.json per Claude Code spec
 * Required: name
 * @param {Object} data - Parsed plugin.json data
 * @param {string} context - Context for error messages
 * @returns {ValidationResult}
 */
export function validatePlugin(data, context = '') {
  const errors = [];
  const warnings = [];
  const prefix = context ? `[${context}] ` : '';

  if (!data || typeof data !== 'object') {
    errors.push(`${prefix}plugin.json must be a valid JSON object`);
    return { valid: false, errors, warnings };
  }

  // Required: name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push(`${prefix}plugin.json requires "name" field (non-empty string)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate SKILL.md frontmatter per Claude Code spec
 * Required: name, description
 * @param {Object|null} frontmatter - Parsed YAML frontmatter
 * @param {string} context - Context for error messages
 * @returns {ValidationResult}
 */
export function validateSkill(frontmatter, context = '') {
  const errors = [];
  const warnings = [];
  const prefix = context ? `[${context}] ` : '';

  if (!frontmatter || typeof frontmatter !== 'object') {
    errors.push(`${prefix}SKILL.md requires YAML frontmatter with name and description`);
    return { valid: false, errors, warnings };
  }

  // Required: name
  if (!frontmatter.name || typeof frontmatter.name !== 'string' || frontmatter.name.trim() === '') {
    errors.push(`${prefix}SKILL.md frontmatter requires "name" field (non-empty string)`);
  }

  // Required: description
  if (!frontmatter.description || typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') {
    errors.push(`${prefix}SKILL.md frontmatter requires "description" field (non-empty string)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Log validation results
 * @param {ValidationResult} result - Validation result
 * @param {string} resourceType - Type of resource (marketplace, plugin, skill, command)
 * @param {string} context - Context for logging
 */
export function logValidationResult(result, resourceType, context) {
  if (!result.valid) {
    logError(`Validation failed for ${resourceType}: ${context}`, null);
    result.errors.forEach(err => log(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    log(`Validation warnings for ${resourceType}: ${context}`);
    result.warnings.forEach(warn => log(`  - ${warn}`));
  }
}
