import { describe, it } from 'node:test';
import assert from 'node:assert';

import { sanitizeFilename, decodeBase64 } from '../src/lib/utils.js';
import { normalizeSourcePath } from '../src/lib/parser.js';
import { validateMarketplace, validatePlugin, validateSkill } from '../src/lib/validator.js';

// ============================================
// UTILS.JS - PURE FUNCTION TESTS
// ============================================

describe('Utils: sanitizeFilename', () => {
  it('should allow alphanumeric characters', () => {
    assert.strictEqual(sanitizeFilename('abc123'), 'abc123');
    assert.strictEqual(sanitizeFilename('ABC'), 'ABC');
  });

  it('should allow hyphens and underscores', () => {
    assert.strictEqual(sanitizeFilename('my-file_name'), 'my-file_name');
  });

  it('should replace special characters with underscores', () => {
    assert.strictEqual(sanitizeFilename('file name.txt'), 'file_name_txt');
    assert.strictEqual(sanitizeFilename('user@domain'), 'user_domain');
    assert.strictEqual(sanitizeFilename('path/to/file'), 'path_to_file');
  });

  it('should handle empty string', () => {
    assert.strictEqual(sanitizeFilename(''), '');
  });

  it('should sanitize dangerous characters', () => {
    assert.strictEqual(sanitizeFilename('../../../etc/passwd'), '_________etc_passwd');
    assert.strictEqual(sanitizeFilename('file<>:"|?*'), 'file_______');
  });
});

describe('Utils: decodeBase64', () => {
  it('should decode valid base64 to UTF-8', () => {
    const encoded = Buffer.from('Hello World').toString('base64');
    assert.strictEqual(decodeBase64(encoded), 'Hello World');
  });

  it('should handle unicode characters', () => {
    const text = 'Hello 世界 🌍';
    const encoded = Buffer.from(text).toString('base64');
    assert.strictEqual(decodeBase64(encoded), text);
  });

  it('should handle empty string', () => {
    assert.strictEqual(decodeBase64(''), '');
  });

  it('should decode JSON content', () => {
    const json = '{"name": "test", "value": 123}';
    const encoded = Buffer.from(json).toString('base64');
    assert.strictEqual(decodeBase64(encoded), json);
  });
});

// ============================================
// SECURITY TESTS - PATH TRAVERSAL
// ============================================

describe('Security: normalizeSourcePath path traversal', () => {
  it('should reject paths with parent traversal', () => {
    assert.strictEqual(normalizeSourcePath('../secret'), '');
    assert.strictEqual(normalizeSourcePath('../../etc/passwd'), '');
    assert.strictEqual(normalizeSourcePath('./plugins/../../../secret'), '');
  });

  it('should reject paths with embedded traversal', () => {
    assert.strictEqual(normalizeSourcePath('plugins/..hidden/file'), '');
    assert.strictEqual(normalizeSourcePath('plugins/foo/../bar'), '');
  });

  it('should allow valid paths', () => {
    assert.strictEqual(normalizeSourcePath('./plugins/foo'), 'plugins/foo');
    assert.strictEqual(normalizeSourcePath('plugins/foo'), 'plugins/foo');
    assert.strictEqual(normalizeSourcePath('./src/lib/utils'), 'src/lib/utils');
  });

  it('should handle multiple leading ./', () => {
    assert.strictEqual(normalizeSourcePath('././plugins/foo'), 'plugins/foo');
    assert.strictEqual(normalizeSourcePath('./././foo'), 'foo');
  });
});

// ============================================
// VALIDATOR EDGE CASES
// ============================================

describe('Validator: marketplace.json edge cases', () => {
  it('should fail for null input', () => {
    const result = validateMarketplace(null);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('valid JSON object')));
  });

  it('should fail for array input', () => {
    const result = validateMarketplace([]);
    assert.strictEqual(result.valid, false);
  });

  it('should fail for string input', () => {
    const result = validateMarketplace('not an object');
    assert.strictEqual(result.valid, false);
  });

  it('should warn on empty plugins array', () => {
    const data = { name: 'test-marketplace', plugins: [] };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes('empty plugins')));
  });

  it('should fail for whitespace-only name', () => {
    const data = { name: '   ', plugins: [{ name: 'p1', source: './p1' }] };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
  });

  it('should fail for invalid plugin entry (not an object)', () => {
    const data = { name: 'test', plugins: ['invalid', null, 123] };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 3);
  });

  it('should accept source as object', () => {
    const data = {
      name: 'test',
      plugins: [{ name: 'p1', source: { github: 'owner/repo' } }]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, true);
  });

  it('should fail for source of wrong type', () => {
    const data = {
      name: 'test',
      plugins: [{ name: 'p1', source: 123 }]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('source')));
  });

  it('should include context in error messages', () => {
    const data = { name: '', plugins: [] };
    const result = validateMarketplace(data, 'owner/repo');
    assert.ok(result.errors.some(e => e.includes('owner/repo')));
  });
});

describe('Validator: plugin.json edge cases', () => {
  it('should fail for null input', () => {
    const result = validatePlugin(null);
    assert.strictEqual(result.valid, false);
  });

  it('should fail for whitespace-only name', () => {
    const result = validatePlugin({ name: '   ' });
    assert.strictEqual(result.valid, false);
  });

  it('should include context in error messages', () => {
    const result = validatePlugin({ name: '' }, 'plugin-path');
    assert.ok(result.errors.some(e => e.includes('plugin-path')));
  });
});

describe('Validator: skill edge cases', () => {
  it('should fail for whitespace-only name', () => {
    const result = validateSkill({ name: '   ', description: 'valid' });
    assert.strictEqual(result.valid, false);
  });

  it('should fail for whitespace-only description', () => {
    const result = validateSkill({ name: 'valid', description: '   ' });
    assert.strictEqual(result.valid, false);
  });

  it('should include context in error messages', () => {
    const result = validateSkill({}, 'skill-path');
    assert.ok(result.errors.some(e => e.includes('skill-path')));
  });
});
