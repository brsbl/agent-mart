/**
 * Rules-based categorization system for marketplaces
 * Single unified category dimension (12 categories)
 */

// ============================================
// CATEGORY RULES (Single Dimension)
// ============================================

/**
 * Category rules with patterns and keywords
 * Each category has:
 * - label: Display name
 * - patterns: Regex patterns to match
 * - keywords: Exact keyword matches (case-insensitive)
 */
export const CATEGORY_RULES = {
  'knowledge-base': {
    label: 'Agent Memory',
    patterns: [/\bmemory\b/i, /\bknowledge\s*base/i, /\brag\b/i, /\bretrieval/i],
    keywords: ['memory', 'knowledge', 'context', 'embedding', 'vector']
  },
  templates: {
    label: 'Templates',
    patterns: [/\btemplate/i, /\bscaffold/i, /\bboilerplate/i, /\bstarter/i, /\btutor/i, /\blearn/i, /\bteach/i, /\bcourse/i, /\blesson/i],
    keywords: ['template', 'scaffold', 'boilerplate', 'starter', 'generator', 'education', 'tutorial', 'learning', 'training']
  },
  devops: {
    label: 'DevOps',
    patterns: [/\bci\/?cd\b/i, /\bkubernetes\b/i, /\bhelm\b/i, /\bterraform/i],
    keywords: ['devops', 'deploy', 'infrastructure', 'docker', 'aws', 'cloud']
  },
  'code-quality': {
    label: 'Code Quality',
    patterns: [/\blint/i, /\bformat/i, /\brefactor/i, /\bclean\s*code/i],
    keywords: ['lint', 'format', 'quality', 'refactor', 'eslint', 'prettier']
  },
  'code-review': {
    label: 'Code Review',
    patterns: [/\bcode\s*review/i, /\bpr\s*review/i, /\breview\s*code/i],
    keywords: ['pr', 'pull-request', 'code-feedback']
  },
  testing: {
    label: 'Testing',
    patterns: [/\btest(?:s|ing)?\b/i, /\bspec\b/i, /\bjest\b/i, /\bvitest\b/i, /\bpytest\b/i],
    keywords: ['test', 'testing', 'tdd', 'unit', 'integration', 'e2e']
  },
  'data-analytics': {
    label: 'Data & Analytics',
    patterns: [/\banalytics/i, /\bdata\s*pipeline/i, /\betl\b/i, /\bsql\b/i],
    keywords: ['data', 'analytics', 'database', 'sql', 'visualization', 'chart']
  },
  design: {
    label: 'Design',
    patterns: [/\bui\/?ux\b/i, /\bfigma\b/i, /\bdesign\s*system/i],
    keywords: ['design', 'ui', 'ux', 'figma', 'css', 'styling', 'tailwind']
  },
  documentation: {
    label: 'Documentation',
    patterns: [/\bdoc(?:s|umentation)\b/i, /\breadme\b/i, /\bapi\s*docs/i],
    keywords: ['docs', 'documentation', 'readme', 'jsdoc', 'typedoc']
  },
  planning: {
    label: 'Planning',
    patterns: [/\bplan(?:ning)?\b/i, /\bspec(?:ification)?s?\b/i, /\bprd\b/i],
    keywords: ['plan', 'planning', 'roadmap', 'spec', 'requirements']
  },
  security: {
    label: 'Security',
    patterns: [/\bsecurity\b/i, /\bvulnerabil/i, /\bauth(?:entication)?\b/i],
    keywords: ['security', 'auth', 'vulnerability', 'pentest', 'encryption']
  },
  orchestration: {
    label: 'Orchestration',
    patterns: [/\bmulti[- ]?agent/i, /\borchestrat/i, /\bswarm\b/i, /\bcrew\b/i],
    keywords: ['orchestration', 'multi-agent', 'agent-workflow', 'pipeline', 'swarm']
  }
};

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Build searchable text from marketplace data
 * Concatenates all relevant text fields for pattern matching
 */
export function buildSearchText(marketplace) {
  const parts = [];

  // Marketplace-level fields
  if (marketplace.description) parts.push(marketplace.description);
  if (marketplace.repo_description) parts.push(marketplace.repo_description);
  if (marketplace.keywords?.length) parts.push(marketplace.keywords.join(' '));
  if (marketplace.name) parts.push(marketplace.name);

  // Plugin-level fields
  if (marketplace.plugins?.length) {
    for (const plugin of marketplace.plugins) {
      if (plugin.description) parts.push(plugin.description);
      if (plugin.name) parts.push(plugin.name);

      // Command descriptions
      if (plugin.commands?.length) {
        for (const cmd of plugin.commands) {
          if (cmd.description) parts.push(cmd.description);
        }
      }

      // Skill descriptions
      if (plugin.skills?.length) {
        for (const skill of plugin.skills) {
          if (skill.description) parts.push(skill.description);
        }
      }
    }
  }

  return parts.join(' ');
}

/**
 * Build searchable text from a single plugin
 */
export function buildPluginSearchText(plugin) {
  if (!plugin) return '';
  const parts = [];

  if (plugin.name) parts.push(plugin.name);
  if (plugin.description) parts.push(plugin.description);

  // Command names and descriptions
  if (plugin.commands?.length) {
    for (const cmd of plugin.commands) {
      if (cmd.name) parts.push(cmd.name);
      if (cmd.description) parts.push(cmd.description);
    }
  }

  // Skill names and descriptions
  if (plugin.skills?.length) {
    for (const skill of plugin.skills) {
      if (skill.name) parts.push(skill.name);
      if (skill.description) parts.push(skill.description);
    }
  }

  return parts.join(' ');
}

/**
 * Check if any pattern matches the text
 */
function matchesPatterns(text, patterns) {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if any keyword matches in the text (case-insensitive, word boundaries)
 */
function matchesKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
    if (regex.test(lowerText)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract categories from text
 * Returns array of category IDs that match
 */
export function extractCategoriesFromText(text) {
  const matched = new Set();

  for (const [categoryId, rule] of Object.entries(CATEGORY_RULES)) {
    const hasPatternMatch = matchesPatterns(text, rule.patterns);
    const hasKeywordMatch = matchesKeywords(text, rule.keywords);

    if (hasPatternMatch || hasKeywordMatch) {
      matched.add(categoryId);
    }
  }

  return Array.from(matched).sort();
}

/**
 * Extract categories for a single plugin
 * @param {object} plugin - Plugin object with name, description, commands, skills
 * @returns {string[]} Array of category IDs
 */
export function extractPluginCategories(plugin) {
  const text = buildPluginSearchText(plugin);
  return extractCategoriesFromText(text);
}

/**
 * Main extraction function - categorize a marketplace
 * Returns single array of categories (union of all plugin categories + marketplace-level matches)
 */
export function extractCategories(marketplace) {
  const text = buildSearchText(marketplace);
  return extractCategoriesFromText(text);
}

// ============================================
// TAXONOMY EXPORT (for frontend)
// ============================================

/**
 * Generate taxonomy data for category-taxonomy.json
 */
export function generateTaxonomy() {
  const categories = {};
  for (const [id, rule] of Object.entries(CATEGORY_RULES)) {
    categories[id] = { label: rule.label };
  }

  return { categories };
}
