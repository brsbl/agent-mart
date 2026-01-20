/**
 * Rules-based categorization system for marketplaces
 * Two dimensions: Tech Stack + Capabilities
 */

// ============================================
// EXTRACTION RULES
// ============================================

/**
 * Tech Stack patterns - what the user already uses
 * Detected via text patterns and file tree presence
 */
export const TECH_STACK_RULES = {
  nextjs: {
    label: 'Next.js',
    // Removed: vercel (detects hosting, not framework)
    patterns: [/\bnext\.?js\b/i, /\bapp\s*router\b/i, /\bpages\s*router\b/i],
    files: ['next.config.js', 'next.config.ts', 'next.config.mjs']
  },
  react: {
    label: 'React',
    // Removed: jsx (too broad, appears in docs/errors)
    patterns: [/\breact\b/i, /\breact\s*components?\b/i],
    files: [],
    excludeIf: ['nextjs']
  },
  vue: {
    label: 'Vue',
    patterns: [/\bvue\.?js\b/i, /\bvue\b/i, /\bnuxt\.?js\b/i, /\bnuxt\b/i, /\bvuejs\b/i],
    files: ['vue.config.js', 'nuxt.config.js', 'nuxt.config.ts']
  },
  python: {
    label: 'Python',
    // Removed: python (too broad), keep framework-specific patterns
    patterns: [/\bdjango\b/i, /\bfastapi\b/i, /\bflask\b/i, /\bpytest\b/i, /\bpython\s*(?:backend|server|api)\b/i],
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile']
  },
  node: {
    label: 'Node.js',
    // Removed: npm (too broad)
    patterns: [/\bnode\.?js\b/i, /\bexpress\.?js\b/i, /\bexpress\b/i, /\bkoa\b/i, /\bfastify\b/i, /\bnest\.?js\b/i],
    files: ['package.json'],
    excludeIf: ['nextjs', 'react', 'vue']
  },
  typescript: {
    label: 'TypeScript',
    // Rely primarily on tsconfig.json file detection
    patterns: [/\btypescript\s*(?:backend|server|api|project)\b/i, /\btsc\b/i],
    files: ['tsconfig.json']
  },
  go: {
    label: 'Go',
    patterns: [/\bgolang\b/i, /\bgo\s+(?:module|mod|get|build)\b/i],
    files: ['go.mod', 'go.sum']
  },
  rust: {
    label: 'Rust',
    patterns: [/\brust\b/i, /\bcargo\b/i, /\brustup\b/i],
    files: ['Cargo.toml', 'Cargo.lock']
  },
  supabase: {
    label: 'Supabase',
    patterns: [/\bsupabase\b/i],
    files: ['supabase/config.toml']
  },
  aws: {
    label: 'AWS',
    // Removed: lambda, s3 (too broad without context)
    patterns: [/\baws\b/i, /\bec2\b/i, /\bdynamodb\b/i, /\bcloudformation\b/i, /\bcdk\b/i, /\bamazon\s*web\s*services\b/i, /\baws\s*lambda\b/i, /\bs3\s*bucket\b/i],
    files: ['serverless.yml', 'template.yaml', 'cdk.json']
  },
  docker: {
    label: 'Docker',
    // Removed: container (too broad)
    patterns: [/\bdocker\b/i, /\bdocker-?compose\b/i],
    files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore']
  },
  postgres: {
    label: 'PostgreSQL',
    // Removed: pg (too broad, matches pg-13 etc)
    patterns: [/\bpostgres(?:ql)?\b/i, /\bpsql\b/i],
    files: []
  }
};

/**
 * Capabilities patterns - what the agent does
 * Detected via text patterns with anti-patterns to reduce false positives
 */
export const CAPABILITIES_RULES = {
  orchestration: {
    label: 'Orchestration',
    patterns: [
      /\bmulti[- ]?agent\b/i,
      /\bswarm\b/i,
      /\bcrew\b/i,
      /\bteam\s+of\s+agents\b/i,
      /\borchestrat/i,
      /\bagent\s*coordination\b/i,
      /\bagent\s*framework\b/i
    ],
    antiPatterns: []
  },
  memory: {
    label: 'Memory',
    patterns: [
      /\brag\b/i,
      /\bvector\s*(?:store|database|db|search)\b/i,
      /\bembeddings?\b/i,
      /\bcontext\s*(?:window|management)\b/i,
      /\blong[- ]?term\s*(?:memory|context)\b/i,
      /\bai\s*memory\b/i,
      /\bagent\s*memory\b/i
    ],
    // Removed broad "memory" and "remember" patterns
    antiPatterns: [/\bmemory\s*leak/i, /\bout\s*of\s*memory/i, /\bmemory\s*usage/i]
  },
  'browser-automation': {
    label: 'Browser Automation',
    // Only tool names are reliable - removed broad patterns
    patterns: [
      /\bplaywright\b/i,
      /\bpuppeteer\b/i,
      /\bselenium\b/i,
      /\bcypress\b/i
    ],
    antiPatterns: []
  },
  boilerplate: {
    label: 'Boilerplate',
    patterns: [
      /\bscaffold/i,
      /\bgenerat(?:e|or|ing)\s*(?:code|project|app)/i,
      /\bboilerplate\b/i,
      /\bstarter\s*(?:kit|template|project)\b/i,
      /\bcreate\s*(?:new\s*)?project/i,
      /\bproject\s*generator\b/i
    ],
    // Removed broad "template" and "starter" patterns
    antiPatterns: [/\btemplate\s*literal/i, /\bstring\s*template/i]
  },
  review: {
    label: 'Code Review',
    patterns: [
      /\bcode\s*review/i,
      /\bpr\s*review/i,
      /\bpull\s*request\s*review/i,
      /\blint(?:ing|er)?\b/i,
      /\banalyze\s*code/i,
      /\bcode\s*analysis/i,
      /\brefactor/i,
      /\bcode\s*quality/i,
      /\beslint\b/i,
      /\bprettier\b/i
    ],
    antiPatterns: [/\blint\s*(?:and\s*clean|model|data)\b/i]
  },
  testing: {
    label: 'Testing',
    patterns: [
      /\btest(?:ing)?\b/i,
      /\be2e\b/i,
      /\bend[- ]?to[- ]?end\b/i,
      /\bunit\s*test/i,
      /\btdd\b/i,
      /\bqa\b/i,
      /\bcoverage\b/i,
      /\bjest\b/i,
      /\bvitest\b/i,
      /\bpytest\b/i,
      /\bmocha\b/i
    ],
    antiPatterns: [/\btest\s*data/i, /\btest\s*file/i]
  },
  devops: {
    label: 'DevOps',
    patterns: [
      /\bdevops\b/i,
      /\bdeploy(?:ment|ing)?\b/i,
      /\bci[\/\-]?cd\b/i,
      /\binfrastructure\s*(?:as\s*code)?\b/i,
      /\bkubernetes\b/i,
      /\bk8s\b/i,
      /\bterraform\b/i,
      /\bansible\b/i,
      /\bhelm\b/i
    ],
    // Removed broad "pipeline" pattern
    antiPatterns: [/\betl\s*pipeline/i, /\bdata\s*pipeline/i]
  },
  documentation: {
    label: 'Documentation',
    patterns: [
      /\bdocumentation\b/i,
      /\bapi\s*docs/i,
      /\bjsdoc\b/i,
      /\btypedoc\b/i,
      /\bdocstring/i,
      /\bgenerate\s*docs/i,
      /\bsphinx\b/i,
      /\bmkdocs\b/i
    ],
    // Removed broad "docs" and "readme" patterns
    antiPatterns: [/\bread\s*the\s*docs/i, /\bsee\s*docs/i, /\bdocs?\s*folder/i]
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
 * Get file paths from marketplace file tree
 */
function getFilePaths(fileTree) {
  if (!fileTree?.length) return [];
  return fileTree.map(entry => entry.path);
}

/**
 * Check if any pattern matches the text, excluding anti-patterns
 */
function matchesPatterns(text, patterns, antiPatterns = []) {
  // First check if any anti-pattern matches
  for (const antiPattern of antiPatterns) {
    if (antiPattern.test(text)) {
      return false;
    }
  }

  // Then check if any pattern matches
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if any file indicator is present in the file tree
 */
function hasFileIndicator(filePaths, fileIndicators) {
  for (const indicator of fileIndicators) {
    for (const filePath of filePaths) {
      if (filePath === indicator || filePath.endsWith('/' + indicator) || filePath.startsWith(indicator + '/')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract tech stack from marketplace data
 */
export function extractTechStack(text, fileTree) {
  const filePaths = getFilePaths(fileTree);
  const matched = new Set();

  for (const [techId, rule] of Object.entries(TECH_STACK_RULES)) {
    // Check text patterns
    const hasTextMatch = matchesPatterns(text, rule.patterns);

    // Check file indicators
    const hasFileMatch = rule.files?.length > 0 && hasFileIndicator(filePaths, rule.files);

    if (hasTextMatch || hasFileMatch) {
      matched.add(techId);
    }
  }

  // Apply exclusion rules (e.g., don't show React if Next.js is present)
  for (const [techId, rule] of Object.entries(TECH_STACK_RULES)) {
    if (matched.has(techId) && rule.excludeIf?.length) {
      for (const excluder of rule.excludeIf) {
        if (matched.has(excluder)) {
          matched.delete(techId);
          break;
        }
      }
    }
  }

  return Array.from(matched).sort();
}

/**
 * Extract capabilities from marketplace data
 */
export function extractCapabilities(text) {
  const matched = new Set();

  for (const [capId, rule] of Object.entries(CAPABILITIES_RULES)) {
    if (matchesPatterns(text, rule.patterns, rule.antiPatterns)) {
      matched.add(capId);
    }
  }

  return Array.from(matched).sort();
}

/**
 * Main extraction function - categorize a marketplace
 */
export function extractCategories(marketplace) {
  const text = buildSearchText(marketplace);

  return {
    techStack: extractTechStack(text, marketplace.file_tree),
    capabilities: extractCapabilities(text)
  };
}

// ============================================
// TAXONOMY EXPORT (for frontend)
// ============================================

/**
 * Generate taxonomy data for categories.json
 */
export function generateTaxonomy() {
  const techStack = {};
  for (const [id, rule] of Object.entries(TECH_STACK_RULES)) {
    techStack[id] = { label: rule.label };
  }

  const capabilities = {};
  for (const [id, rule] of Object.entries(CAPABILITIES_RULES)) {
    capabilities[id] = { label: rule.label };
  }

  return { techStack, capabilities };
}
