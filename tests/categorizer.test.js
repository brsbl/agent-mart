import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import categorizer functions
import {
  normalizeCategory,
  collectPluginCategories,
  generateTaxonomy
} from '../src/lib/categorizer.js';

// ============================================
// CATEGORIZER.JS TESTS - SIMPLE NORMALIZATION SYSTEM
// ============================================

describe('Categorizer: normalizeCategory', () => {
  it('should lowercase and trim input', () => {
    assert.strictEqual(normalizeCategory('  DevOps  '), 'devops');
    assert.strictEqual(normalizeCategory('TESTING'), 'testing');
  });

  it('should convert spaces to hyphens', () => {
    assert.strictEqual(normalizeCategory('code review'), 'code-review');
    assert.strictEqual(normalizeCategory('data  analytics'), 'data-analytics');
  });

  it('should apply variant mappings', () => {
    assert.strictEqual(normalizeCategory('cicd'), 'ci-cd');
    assert.strictEqual(normalizeCategory('ci/cd'), 'ci-cd');
    assert.strictEqual(normalizeCategory('dev-ops'), 'devops');
    assert.strictEqual(normalizeCategory('front-end'), 'frontend');
    assert.strictEqual(normalizeCategory('back-end'), 'backend');
  });

  it('should return null for invalid input', () => {
    assert.strictEqual(normalizeCategory(null), null);
    assert.strictEqual(normalizeCategory(undefined), null);
    assert.strictEqual(normalizeCategory(''), null);
    assert.strictEqual(normalizeCategory('   '), null);
    assert.strictEqual(normalizeCategory(123), null);
  });

  it('should preserve valid categories', () => {
    assert.strictEqual(normalizeCategory('testing'), 'testing');
    assert.strictEqual(normalizeCategory('documentation'), 'documentation');
    assert.strictEqual(normalizeCategory('security'), 'security');
  });
});

describe('Categorizer: collectPluginCategories', () => {
  it('should return empty array for invalid input', () => {
    assert.deepStrictEqual(collectPluginCategories(null), []);
    assert.deepStrictEqual(collectPluginCategories(undefined), []);
    assert.deepStrictEqual(collectPluginCategories('string'), []);
    assert.deepStrictEqual(collectPluginCategories(123), []);
  });

  it('should collect from category field', () => {
    const plugin = { category: 'testing' };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('testing'));
  });

  it('should collect from tag field', () => {
    const plugin = { tag: 'devops' };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('devops'));
  });

  it('should collect from categories array', () => {
    const plugin = { categories: ['testing', 'documentation'] };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('testing'));
    assert.ok(result.includes('documentation'));
  });

  it('should collect from tags array', () => {
    const plugin = { tags: ['devops', 'ci-cd'] };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('devops'));
    assert.ok(result.includes('ci-cd'));
  });

  it('should collect from keywords array', () => {
    const plugin = { keywords: ['testing', 'automation'] };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('testing'));
    assert.ok(result.includes('automation'));
  });

  it('should normalize collected categories', () => {
    const plugin = { categories: ['  DevOps  ', 'CI/CD', 'front-end'] };
    const result = collectPluginCategories(plugin);
    assert.ok(result.includes('devops'));
    assert.ok(result.includes('ci-cd'));
    assert.ok(result.includes('frontend'));
  });

  it('should deduplicate categories', () => {
    const plugin = {
      category: 'testing',
      categories: ['testing', 'TESTING'],
      tags: ['Testing']
    };
    const result = collectPluginCategories(plugin);
    const testingCount = result.filter(c => c === 'testing').length;
    assert.strictEqual(testingCount, 1);
  });

  it('should return sorted array', () => {
    const plugin = { categories: ['zebra', 'alpha', 'beta'] };
    const result = collectPluginCategories(plugin);
    const sorted = [...result].sort();
    assert.deepStrictEqual(result, sorted);
  });

  it('should handle empty plugin', () => {
    const plugin = {};
    const result = collectPluginCategories(plugin);
    assert.deepStrictEqual(result, []);
  });

  it('should filter out null/invalid categories', () => {
    const plugin = { categories: [null, '', '   ', 'valid', undefined] };
    const result = collectPluginCategories(plugin);
    assert.deepStrictEqual(result, ['valid']);
  });
});

describe('Categorizer: generateTaxonomy', () => {
  it('should return object with categories property', () => {
    const taxonomy = generateTaxonomy();
    assert.ok(taxonomy.categories !== undefined);
  });

  it('should return empty categories (dynamic system)', () => {
    const taxonomy = generateTaxonomy();
    assert.deepStrictEqual(taxonomy.categories, {});
  });
});
