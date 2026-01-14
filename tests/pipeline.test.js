import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import parser functions
import { parseJson, parseFrontmatter, normalizeSourcePath } from '../src/lib/parser.js';

describe('Parser: Input Validation', () => {
  it('parseJson should return null for non-string input', () => {
    assert.strictEqual(parseJson(null), null);
    assert.strictEqual(parseJson(undefined), null);
    assert.strictEqual(parseJson(123), null);
    assert.strictEqual(parseJson({}), null);
    assert.strictEqual(parseJson([]), null);
  });

  it('parseFrontmatter should handle non-string input', () => {
    const result1 = parseFrontmatter(null);
    assert.strictEqual(result1.frontmatter, null);
    assert.strictEqual(result1.body, '');

    const result2 = parseFrontmatter(undefined);
    assert.strictEqual(result2.frontmatter, null);
    assert.strictEqual(result2.body, '');

    const result3 = parseFrontmatter(123);
    assert.strictEqual(result3.frontmatter, null);
    assert.strictEqual(result3.body, '');
  });

  it('normalizeSourcePath should handle null/undefined', () => {
    assert.strictEqual(normalizeSourcePath(null), '');
    assert.strictEqual(normalizeSourcePath(undefined), '');
    assert.strictEqual(normalizeSourcePath(123), '');
  });
});

describe('Pipeline: File Pattern Matching', () => {
  // Test the regex patterns used in 04-fetch-files.js
  const FILE_PATTERNS = [
    /^\.claude-plugin\/marketplace\.json$/,
    /(^|\/)?\.claude-plugin\/plugin\.json$/,
    /(^|\/)commands\/[^/]+\.md$/,
    /(^|\/)skills\/[^/]+\/SKILL\.md$/
  ];

  function shouldFetchFile(path) {
    return FILE_PATTERNS.some(pattern => pattern.test(path));
  }

  it('should match marketplace.json at root', () => {
    assert.strictEqual(shouldFetchFile('.claude-plugin/marketplace.json'), true);
  });

  it('should not match nested marketplace.json', () => {
    assert.strictEqual(shouldFetchFile('nested/.claude-plugin/marketplace.json'), false);
  });

  it('should match plugin.json at root', () => {
    assert.strictEqual(shouldFetchFile('.claude-plugin/plugin.json'), true);
  });

  it('should match plugin.json in nested plugin', () => {
    assert.strictEqual(shouldFetchFile('plugins/foo/.claude-plugin/plugin.json'), true);
  });

  it('should match commands/*.md', () => {
    assert.strictEqual(shouldFetchFile('commands/my-command.md'), true);
    assert.strictEqual(shouldFetchFile('plugins/foo/commands/bar.md'), true);
  });

  it('should not match non-.md files in commands', () => {
    assert.strictEqual(shouldFetchFile('commands/readme.txt'), false);
  });

  it('should match skills/*/SKILL.md', () => {
    assert.strictEqual(shouldFetchFile('skills/my-skill/SKILL.md'), true);
    assert.strictEqual(shouldFetchFile('plugins/foo/skills/bar/SKILL.md'), true);
  });

  it('should NOT match arbitrary SKILL.md files', () => {
    // This was the bug - /SKILL\.md$/ was too broad
    assert.strictEqual(shouldFetchFile('SKILL.md'), false);
    assert.strictEqual(shouldFetchFile('random/SKILL.md'), false);
    assert.strictEqual(shouldFetchFile('docs/MY-SKILL.md'), false);
  });
});

describe('Security: GraphQL Sanitization', () => {
  // Test the sanitization function logic
  function sanitizeForGraphQL(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  it('should escape double quotes', () => {
    assert.strictEqual(sanitizeForGraphQL('test"injection'), 'test\\"injection');
  });

  it('should escape backslashes', () => {
    assert.strictEqual(sanitizeForGraphQL('test\\path'), 'test\\\\path');
  });

  it('should handle combined escapes', () => {
    assert.strictEqual(sanitizeForGraphQL('a\\b"c'), 'a\\\\b\\"c');
  });

  it('should return empty string for non-string input', () => {
    assert.strictEqual(sanitizeForGraphQL(null), '');
    assert.strictEqual(sanitizeForGraphQL(undefined), '');
    assert.strictEqual(sanitizeForGraphQL(123), '');
  });

  it('should pass through safe strings unchanged', () => {
    assert.strictEqual(sanitizeForGraphQL('owner/repo'), 'owner/repo');
    assert.strictEqual(sanitizeForGraphQL('main'), 'main');
  });
});
