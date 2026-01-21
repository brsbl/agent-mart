import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import categorizer functions
import {
  CATEGORY_RULES,
  buildSearchText,
  buildPluginSearchText,
  extractCategoriesFromText,
  extractPluginCategories,
  extractCategories,
  generateTaxonomy
} from '../src/lib/categorizer.js';

// ============================================
// CATEGORIZER.JS TESTS - NEW UNIFIED SYSTEM
// ============================================

describe('Categorizer: CATEGORY_RULES constant', () => {
  it('should have all 12 expected categories', () => {
    const expectedCategories = [
      'knowledge-base',
      'templates',
      'devops',
      'code-quality',
      'code-review',
      'testing',
      'data-analytics',
      'design',
      'documentation',
      'planning',
      'security',
      'orchestration'
    ];

    for (const cat of expectedCategories) {
      assert.ok(CATEGORY_RULES[cat], `Missing category: ${cat}`);
      assert.ok(CATEGORY_RULES[cat].label, `Missing label for: ${cat}`);
      assert.ok(Array.isArray(CATEGORY_RULES[cat].patterns), `Missing patterns for: ${cat}`);
      assert.ok(Array.isArray(CATEGORY_RULES[cat].keywords), `Missing keywords for: ${cat}`);
    }
  });

  it('should not have education as a separate category', () => {
    assert.strictEqual(CATEGORY_RULES['education'], undefined);
  });
});

describe('Categorizer: buildSearchText', () => {
  it('should concatenate marketplace description and name', () => {
    const marketplace = {
      name: 'my-plugin',
      description: 'A useful tool'
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('A useful tool'));
    assert.ok(text.includes('my-plugin'));
  });

  it('should include repo_description', () => {
    const marketplace = {
      name: 'test',
      repo_description: 'Repository description here'
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('Repository description here'));
  });

  it('should include keywords array', () => {
    const marketplace = {
      name: 'test',
      keywords: ['react', 'typescript', 'testing']
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('react'));
    assert.ok(text.includes('typescript'));
    assert.ok(text.includes('testing'));
  });

  it('should include plugin descriptions', () => {
    const marketplace = {
      name: 'test',
      plugins: [
        { name: 'plugin1', description: 'First plugin description' },
        { name: 'plugin2', description: 'Second plugin description' }
      ]
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('First plugin description'));
    assert.ok(text.includes('Second plugin description'));
    assert.ok(text.includes('plugin1'));
    assert.ok(text.includes('plugin2'));
  });

  it('should include command descriptions', () => {
    const marketplace = {
      name: 'test',
      plugins: [
        {
          name: 'plugin1',
          commands: [
            { name: '/cmd1', description: 'Command one does X' },
            { name: '/cmd2', description: 'Command two does Y' }
          ]
        }
      ]
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('Command one does X'));
    assert.ok(text.includes('Command two does Y'));
  });

  it('should include skill descriptions', () => {
    const marketplace = {
      name: 'test',
      plugins: [
        {
          name: 'plugin1',
          skills: [
            { name: 'skill1', description: 'Skill one does A' },
            { name: 'skill2', description: 'Skill two does B' }
          ]
        }
      ]
    };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('Skill one does A'));
    assert.ok(text.includes('Skill two does B'));
  });

  it('should handle empty marketplace', () => {
    const marketplace = {};
    const text = buildSearchText(marketplace);
    assert.strictEqual(text, '');
  });

  it('should handle null plugins array', () => {
    const marketplace = { name: 'test', plugins: null };
    const text = buildSearchText(marketplace);
    assert.ok(text.includes('test'));
  });
});

describe('Categorizer: buildPluginSearchText', () => {
  it('should include plugin name and description', () => {
    const plugin = {
      name: 'my-plugin',
      description: 'A test plugin'
    };
    const text = buildPluginSearchText(plugin);
    assert.ok(text.includes('my-plugin'));
    assert.ok(text.includes('A test plugin'));
  });

  it('should include command names and descriptions', () => {
    const plugin = {
      name: 'test',
      commands: [
        { name: '/test', description: 'Run tests' }
      ]
    };
    const text = buildPluginSearchText(plugin);
    assert.ok(text.includes('/test'));
    assert.ok(text.includes('Run tests'));
  });

  it('should include skill names and descriptions', () => {
    const plugin = {
      name: 'test',
      skills: [
        { name: 'review', description: 'Code review skill' }
      ]
    };
    const text = buildPluginSearchText(plugin);
    assert.ok(text.includes('review'));
    assert.ok(text.includes('Code review skill'));
  });
});

describe('Categorizer: extractCategoriesFromText', () => {
  // Templates category (includes education patterns)
  it('should detect templates from tutorial', () => {
    const result = extractCategoriesFromText('A tutorial for learning');
    assert.ok(result.includes('templates'));
  });

  // Knowledge base / Memory category
  it('should detect knowledge-base from RAG', () => {
    const result = extractCategoriesFromText('Implements RAG for context retrieval');
    assert.ok(result.includes('knowledge-base'));
  });

  it('should detect knowledge-base from memory', () => {
    const result = extractCategoriesFromText('Long-term memory for agents');
    assert.ok(result.includes('knowledge-base'));
  });

  // Templates category
  it('should detect templates from scaffold', () => {
    const result = extractCategoriesFromText('Scaffold new projects quickly');
    assert.ok(result.includes('templates'));
  });

  it('should detect templates from boilerplate', () => {
    const result = extractCategoriesFromText('React boilerplate generator');
    assert.ok(result.includes('templates'));
  });

  // DevOps category
  it('should detect devops from CI/CD', () => {
    const result = extractCategoriesFromText('Setup CI/CD pipelines');
    assert.ok(result.includes('devops'));
  });

  it('should detect devops from Kubernetes', () => {
    const result = extractCategoriesFromText('Deploy to Kubernetes cluster');
    assert.ok(result.includes('devops'));
  });

  it('should detect devops from docker keyword', () => {
    const result = extractCategoriesFromText('Uses docker containers');
    assert.ok(result.includes('devops'));
  });

  // Code Quality category
  it('should detect code-quality from lint', () => {
    const result = extractCategoriesFromText('Lint your code');
    assert.ok(result.includes('code-quality'));
  });

  it('should detect code-quality from eslint', () => {
    const result = extractCategoriesFromText('Configure eslint for your project');
    assert.ok(result.includes('code-quality'));
  });

  // Code Review category
  it('should detect code-review from code review', () => {
    const result = extractCategoriesFromText('Automated code review tool');
    assert.ok(result.includes('code-review'));
  });

  it('should detect code-review from PR review', () => {
    const result = extractCategoriesFromText('PR review automation');
    assert.ok(result.includes('code-review'));
  });

  // Testing category
  it('should detect testing from Jest', () => {
    const result = extractCategoriesFromText('Run tests with Jest');
    assert.ok(result.includes('testing'));
  });

  it('should detect testing from Vitest', () => {
    const result = extractCategoriesFromText('Vitest for unit testing');
    assert.ok(result.includes('testing'));
  });

  it('should detect testing from test keyword', () => {
    const result = extractCategoriesFromText('Testing framework');
    assert.ok(result.includes('testing'));
  });

  // Data & Analytics category
  it('should detect data-analytics from analytics', () => {
    const result = extractCategoriesFromText('Data analytics platform');
    assert.ok(result.includes('data-analytics'));
  });

  it('should detect data-analytics from SQL', () => {
    const result = extractCategoriesFromText('SQL query builder');
    assert.ok(result.includes('data-analytics'));
  });

  // Design category
  it('should detect design from UI/UX', () => {
    const result = extractCategoriesFromText('UI/UX design tools');
    assert.ok(result.includes('design'));
  });

  it('should detect design from Figma', () => {
    const result = extractCategoriesFromText('Figma integration');
    assert.ok(result.includes('design'));
  });

  // Documentation category
  it('should detect documentation from docs', () => {
    const result = extractCategoriesFromText('Generate documentation');
    assert.ok(result.includes('documentation'));
  });

  it('should detect documentation from JSDoc', () => {
    const result = extractCategoriesFromText('Add JSDoc comments');
    assert.ok(result.includes('documentation'));
  });

  // Planning category
  it('should detect planning from planning', () => {
    const result = extractCategoriesFromText('Project planning tools');
    assert.ok(result.includes('planning'));
  });

  it('should detect planning from spec', () => {
    const result = extractCategoriesFromText('Write specifications');
    assert.ok(result.includes('planning'));
  });

  // Security category
  it('should detect security from security', () => {
    const result = extractCategoriesFromText('Security scanning');
    assert.ok(result.includes('security'));
  });

  it('should detect security from auth', () => {
    const result = extractCategoriesFromText('Authentication helper');
    assert.ok(result.includes('security'));
  });

  // Orchestration category
  it('should detect orchestration from multi-agent', () => {
    const result = extractCategoriesFromText('A multi-agent orchestration framework');
    assert.ok(result.includes('orchestration'));
  });

  it('should detect orchestration from swarm', () => {
    const result = extractCategoriesFromText('Agent swarm coordination');
    assert.ok(result.includes('orchestration'));
  });

  // Multiple categories
  it('should detect multiple categories', () => {
    const result = extractCategoriesFromText('Testing with Jest, ESLint for code quality, deploy to k8s');
    assert.ok(result.includes('testing'));
    assert.ok(result.includes('code-quality'));
    assert.ok(result.includes('devops'));
  });

  it('should return sorted array', () => {
    const result = extractCategoriesFromText('Testing with Jest, ESLint for code quality, deploy to k8s');
    const sorted = [...result].sort();
    assert.deepStrictEqual(result, sorted);
  });

  it('should handle empty input', () => {
    const result = extractCategoriesFromText('');
    assert.deepStrictEqual(result, []);
  });
});

describe('Categorizer: extractPluginCategories', () => {
  it('should extract categories from plugin', () => {
    const plugin = {
      name: 'test-runner',
      description: 'Run tests with Jest'
    };
    const result = extractPluginCategories(plugin);
    assert.ok(result.includes('testing'));
  });

  it('should extract categories from command descriptions', () => {
    const plugin = {
      name: 'my-plugin',
      commands: [
        { name: '/deploy', description: 'Deploy to Kubernetes' }
      ]
    };
    const result = extractPluginCategories(plugin);
    assert.ok(result.includes('devops'));
  });
});

describe('Categorizer: extractCategories', () => {
  it('should extract categories from marketplace', () => {
    const marketplace = {
      name: 'test-plugin',
      description: 'A testing framework with Jest'
    };
    const result = extractCategories(marketplace);
    assert.ok(result.includes('testing'));
  });

  it('should extract categories from keywords', () => {
    const marketplace = {
      name: 'my-plugin',
      keywords: ['docker', 'kubernetes', 'deploy']
    };
    const result = extractCategories(marketplace);
    assert.ok(result.includes('devops'));
  });

  it('should return empty array for empty marketplace', () => {
    const marketplace = {};
    const result = extractCategories(marketplace);
    assert.deepStrictEqual(result, []);
  });
});

describe('Categorizer: generateTaxonomy', () => {
  it('should generate taxonomy with categories', () => {
    const taxonomy = generateTaxonomy();
    assert.ok(taxonomy.categories);
    assert.ok(taxonomy.categories.testing);
    assert.strictEqual(taxonomy.categories.testing.label, 'Testing');
  });

  it('should include all category rules', () => {
    const taxonomy = generateTaxonomy();
    for (const catId of Object.keys(CATEGORY_RULES)) {
      assert.ok(taxonomy.categories[catId], `Missing category: ${catId}`);
    }
  });

  it('should include correct labels', () => {
    const taxonomy = generateTaxonomy();
    assert.strictEqual(taxonomy.categories['knowledge-base'].label, 'Agent Memory');
    assert.strictEqual(taxonomy.categories.devops.label, 'DevOps');
    assert.strictEqual(taxonomy.categories.orchestration.label, 'Orchestration');
    assert.strictEqual(taxonomy.categories.templates.label, 'Templates');
  });
});
