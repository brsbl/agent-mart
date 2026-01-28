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

describe('Pipeline: File Fetching', () => {
  // Test the file fetching logic used in 04-fetch-files.js
  const MAX_FILE_SIZE = 100000;
  const SKIP_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.exe', '.dll', '.so', '.dylib',
    '.lock'
  ]);

  function shouldFetchFile(entry) {
    if (entry.type !== 'blob') return false;
    if (entry.size !== null && entry.size > MAX_FILE_SIZE) return false;
    const path = entry.path.toLowerCase();
    if (path.endsWith('.min.js') || path.endsWith('.min.css')) return false;
    const ext = path.match(/\.[^.]+$/)?.[0];
    if (ext && SKIP_EXTENSIONS.has(ext)) return false;
    if (path.includes('node_modules/') ||
        path.includes('vendor/') ||
        path.includes('.git/')) return false;
    return true;
  }

  it('should fetch text files', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'README.md', size: 1000 }), true);
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'src/index.js', size: 5000 }), true);
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: '.claude-plugin/marketplace.json', size: 500 }), true);
  });

  it('should skip directories', () => {
    assert.strictEqual(shouldFetchFile({ type: 'tree', path: 'src', size: null }), false);
  });

  it('should skip large files', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'large-file.txt', size: 150000 }), false);
  });

  it('should skip binary extensions', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'image.png', size: 1000 }), false);
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'font.woff2', size: 1000 }), false);
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'archive.zip', size: 1000 }), false);
  });

  it('should skip node_modules', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'node_modules/lodash/index.js', size: 1000 }), false);
  });

  it('should skip minified files', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'dist/bundle.min.js', size: 1000 }), false);
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'styles.min.css', size: 1000 }), false);
  });

  it('should fetch files with unknown size', () => {
    assert.strictEqual(shouldFetchFile({ type: 'blob', path: 'unknown.txt', size: null }), true);
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
