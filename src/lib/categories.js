// Single-level category system based on actual marketplace patterns
// Derived from analysis of 919 marketplaces

export const CATEGORIES = [
  'agent',
  'devtools',
  'quality',
  'testing',
  'devops',
  'data',
  'integration',
  'framework',
  'workflow',
  'specialized'
];

// Keywords that indicate each category
// Order matters - first match wins, so more specific patterns come first
const CATEGORY_KEYWORDS = {
  agent: [
    'agent', 'orchestrat', 'multi-agent', 'swarm', 'coordination',
    'autonomous', 'delegate', 'crew', 'team'
  ],
  testing: [
    'test', 'e2e', 'browser-auto', 'playwright', 'selenium', 'cypress',
    'jest', 'vitest', 'mocha', 'pytest'
  ],
  quality: [
    'review', 'lint', 'quality', 'analysis', 'refactor', 'standards',
    'eslint', 'prettier', 'code-review', 'pr-review'
  ],
  devops: [
    'ci-cd', 'cicd', 'deploy', 'infrastructure', 'kubernetes', 'k8s',
    'docker', 'terraform', 'cloud', 'aws', 'gcp', 'azure', 'helm',
    'ansible', 'jenkins', 'github-actions'
  ],
  data: [
    'data-eng', 'etl', 'analytics', 'sql', 'pipeline', 'bigquery',
    'duckdb', 'spark', 'pandas', 'dbt', 'airflow', 'warehouse'
  ],
  integration: [
    'stripe', 'jira', 'linear', 'slack', 'notion', 'airtable',
    'salesforce', 'hubspot', 'webhook', 'zapier', 'mcp-server'
  ],
  framework: [
    'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
    'django', 'flask', 'fastapi', 'rails', 'laravel', 'phoenix',
    'elixir', 'rust', 'golang', 'swift', 'kotlin', 'dotnet',
    '.net', 'blazor', 'expo', 'flutter', 'tauri'
  ],
  workflow: [
    'workflow', 'spec-driven', 'methodology', 'process', 'discipline',
    'tdd', 'bdd', 'ddd', 'architecture', 'planning', 'prism', 'sdd'
  ],
  specialized: [
    'finance', 'trading', 'blockchain', 'web3', 'crypto', 'nft',
    'robotics', 'ros', 'scientific', 'medical', 'bioinformatics',
    'security', 'pentest', 'reverse-eng', 'malware', 'cad', '3d'
  ],
  // devtools is the catch-all, so no specific keywords needed
  devtools: []
};

// Default category for null/unknown
export const DEFAULT_CATEGORY = 'devtools';

/**
 * Normalize a category to one of the valid categories
 * Uses explicit category, description, and keywords to determine best fit
 * @param {string|object|null} category - Raw category (string or legacy object)
 * @param {string} [description=''] - Marketplace/plugin description
 * @param {string[]} [keywords=[]] - Marketplace keywords array
 * @returns {string} Normalized category string
 */
export function normalizeCategory(category, description = '', keywords = []) {
  // Handle legacy object format { phase, subcategory }
  if (category && typeof category === 'object') {
    // Convert legacy format to new single-level
    const legacyMap = {
      'build/core': 'devtools',
      'build/languages': 'framework',
      'build/frameworks': 'framework',
      'build/ai-ml': 'specialized',
      'build/database': 'data',
      'build/api': 'integration',
      'plan/product': 'workflow',
      'plan/design': 'workflow',
      'plan/architecture': 'workflow',
      'test/unit': 'testing',
      'test/integration': 'testing',
      'test/quality': 'quality',
      'test/security': 'specialized',
      'deploy/ci-cd': 'devops',
      'deploy/infrastructure': 'devops',
      'deploy/cloud': 'devops',
      'deploy/containers': 'devops',
      'operate/monitoring': 'devops',
      'operate/debugging': 'devtools',
      'operate/documentation': 'devtools',
      'operate/git': 'devtools'
    };
    const key = `${category.phase}/${category.subcategory}`;
    return legacyMap[key] || DEFAULT_CATEGORY;
  }

  // If explicit category is provided and valid, use it
  if (category && typeof category === 'string') {
    const lower = category.toLowerCase().trim();
    if (CATEGORIES.includes(lower)) {
      return lower;
    }
  }

  // Build searchable text from description and keywords
  const searchText = [
    category || '',
    description || '',
    ...(keywords || [])
  ].join(' ').toLowerCase();

  // Check each category's keywords (excluding devtools which is default)
  for (const cat of CATEGORIES.filter(c => c !== 'devtools')) {
    const catKeywords = CATEGORY_KEYWORDS[cat];
    if (catKeywords.some(kw => searchText.includes(kw))) {
      return cat;
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Get display name for a category
 * @param {string|null} category
 * @returns {string}
 */
export function getCategoryDisplayName(category) {
  if (!category) return 'Dev Tools';

  const displayNames = {
    agent: 'Agents',
    devtools: 'Dev Tools',
    quality: 'Quality',
    testing: 'Testing',
    devops: 'DevOps',
    data: 'Data',
    integration: 'Integration',
    framework: 'Framework',
    workflow: 'Workflow',
    specialized: 'Specialized'
  };

  return displayNames[category] || 'Dev Tools';
}
