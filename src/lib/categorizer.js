/**
 * Simple category normalization system
 * Preserves original category values with basic cleanup
 */

// ============================================
// CATEGORY VARIANTS (normalize similar spellings)
// ============================================

const CATEGORY_VARIANTS = {
  'cicd': 'ci-cd',
  'ci/cd': 'ci-cd',
  'dev-ops': 'devops',
  'front-end': 'frontend',
  'back-end': 'backend',
};

// ============================================
// NORMALIZATION
// ============================================

/**
 * Normalize a category value
 * - lowercase
 * - trim whitespace
 * - convert spaces to hyphens
 * - apply common variant mappings
 * @param {string|null|undefined} value - Original category value
 * @returns {string|null} Normalized category or null if invalid
 */
export function normalizeCategory(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '-');
  if (!normalized) return null;
  return CATEGORY_VARIANTS[normalized] || normalized;
}

/**
 * Collect and normalize categories from all possible source fields
 * @param {object} pluginDef - Plugin definition from marketplace.json
 * @returns {string[]} Array of normalized category strings
 */
export function collectPluginCategories(pluginDef) {
  if (!pluginDef || typeof pluginDef !== 'object') return [];

  const categories = new Set();

  // Helper to add normalized category
  const add = (value) => {
    const normalized = normalizeCategory(value);
    if (normalized) categories.add(normalized);
  };

  // Handle singular fields
  add(pluginDef.category);
  add(pluginDef.tag);

  // Handle array fields
  const arrayFields = [
    pluginDef.categories,
    pluginDef.tags,
    pluginDef.keywords
  ];

  for (const arr of arrayFields) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        add(item);
      }
    }
  }

  return Array.from(categories).sort();
}

// ============================================
// TAXONOMY EXPORT (for frontend)
// ============================================

/**
 * Generate taxonomy data for categories.json
 * Returns empty object - categories are now dynamic from data
 */
export function generateTaxonomy() {
  return { categories: {} };
}
