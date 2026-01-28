import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ENRICHED_PATH = './data/06-enriched.json';
const INDEX_PATH = './web/public/data/index.json';
const PLUGINS_BROWSE_PATH = './web/public/data/plugins-browse.json';
const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';
const AUTHORS_DIR = './web/public/data/authors';

// Load data files once for all tests
let enrichedData = null;
let indexData = null;
let pluginsBrowseData = null;
let marketplacesBrowseData = null;

function loadJsonSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

before(() => {
  enrichedData = loadJsonSafe(ENRICHED_PATH);
  indexData = loadJsonSafe(INDEX_PATH);
  pluginsBrowseData = loadJsonSafe(PLUGINS_BROWSE_PATH);
  marketplacesBrowseData = loadJsonSafe(MARKETPLACES_BROWSE_PATH);
});

describe('Data Flow: Enriched to Index Consistency', () => {
  it('should have matching author counts', function() {
    if (!enrichedData || !indexData) return this.skip();

    const enrichedAuthorCount = Object.keys(enrichedData.authors).length;
    const indexAuthorCount = indexData.meta.total_authors;

    assert.strictEqual(
      indexAuthorCount,
      enrichedAuthorCount,
      `Author count mismatch: enriched=${enrichedAuthorCount}, index=${indexAuthorCount}`
    );
  });

  it('should have all enriched authors in index', function() {
    if (!enrichedData || !indexData) return this.skip();

    const indexAuthorIds = new Set(indexData.authors.map(a => a.id));

    for (const authorId of Object.keys(enrichedData.authors)) {
      assert.ok(
        indexAuthorIds.has(authorId),
        `Author ${authorId} missing from index`
      );
    }
  });

  it('should preserve author stats in index', function() {
    if (!enrichedData || !indexData) return this.skip();

    // Check a sample of authors
    const sampleSize = Math.min(10, indexData.authors.length);

    for (let i = 0; i < sampleSize; i++) {
      const indexAuthor = indexData.authors[i];
      const enrichedAuthor = enrichedData.authors[indexAuthor.id];

      assert.ok(enrichedAuthor, `Author ${indexAuthor.id} not found in enriched data`);
      assert.deepStrictEqual(
        indexAuthor.stats,
        enrichedAuthor.stats,
        `Stats mismatch for author ${indexAuthor.id}`
      );
    }
  });
});

describe('Data Flow: Plugin Counts Consistency', () => {
  it('should have matching total plugin counts', function() {
    if (!enrichedData || !pluginsBrowseData) return this.skip();

    // Count plugins in enriched data
    let enrichedPluginCount = 0;
    for (const author of Object.values(enrichedData.authors)) {
      for (const marketplace of author.marketplaces) {
        enrichedPluginCount += marketplace.plugins?.length || 0;
      }
    }

    const browsePluginCount = pluginsBrowseData.plugins.length;

    assert.strictEqual(
      browsePluginCount,
      enrichedPluginCount,
      `Plugin count mismatch: enriched=${enrichedPluginCount}, browse=${browsePluginCount}`
    );
  });

  it('should have matching meta.total_plugins in all outputs', function() {
    if (!indexData || !pluginsBrowseData) return this.skip();

    assert.strictEqual(
      indexData.meta.total_plugins,
      pluginsBrowseData.meta.total_plugins,
      `total_plugins mismatch between index and plugins-browse`
    );
  });
});

describe('Data Flow: Marketplace Counts Consistency', () => {
  it('should have matching total marketplace counts', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    // Count marketplaces in enriched data
    let enrichedMarketplaceCount = 0;
    for (const author of Object.values(enrichedData.authors)) {
      enrichedMarketplaceCount += author.marketplaces.length;
    }

    const browseMarketplaceCount = marketplacesBrowseData.marketplaces.length;

    assert.strictEqual(
      browseMarketplaceCount,
      enrichedMarketplaceCount,
      `Marketplace count mismatch: enriched=${enrichedMarketplaceCount}, browse=${browseMarketplaceCount}`
    );
  });

  it('should have matching meta.total_marketplaces in all outputs', function() {
    if (!indexData || !marketplacesBrowseData) return this.skip();

    assert.strictEqual(
      indexData.meta.total_marketplaces,
      marketplacesBrowseData.meta.total_marketplaces,
      `total_marketplaces mismatch between index and marketplaces-browse`
    );
  });
});

describe('Data Flow: Author File Existence', () => {
  it('should have author files for all authors in index', function() {
    if (!indexData) return this.skip();
    if (!fs.existsSync(AUTHORS_DIR)) return this.skip();

    const missingAuthors = [];

    for (const author of indexData.authors) {
      // sanitizeFilename replaces certain chars, but IDs are typically safe
      const authorFile = path.join(AUTHORS_DIR, `${author.id}.json`);
      if (!fs.existsSync(authorFile)) {
        missingAuthors.push(author.id);
      }
    }

    assert.ok(
      missingAuthors.length === 0,
      `Missing author files: ${missingAuthors.slice(0, 10).join(', ')}${missingAuthors.length > 10 ? '...' : ''}`
    );
  });

  it('should have valid JSON in author files (sample)', function() {
    if (!indexData) return this.skip();
    if (!fs.existsSync(AUTHORS_DIR)) return this.skip();

    // Check first 10 authors
    const sampleSize = Math.min(10, indexData.authors.length);

    for (let i = 0; i < sampleSize; i++) {
      const author = indexData.authors[i];
      const authorFile = path.join(AUTHORS_DIR, `${author.id}.json`);

      if (fs.existsSync(authorFile)) {
        const content = fs.readFileSync(authorFile, 'utf8');
        const parsed = JSON.parse(content); // Will throw if invalid

        assert.ok(parsed.author, `Author file ${author.id}.json missing author field`);
        assert.ok(parsed.marketplaces, `Author file ${author.id}.json missing marketplaces field`);
      }
    }
  });
});

describe('Data Flow: Plugin Author References', () => {
  it('should have valid author_id references in plugins-browse', function() {
    if (!pluginsBrowseData || !enrichedData) return this.skip();

    const authorIds = new Set(Object.keys(enrichedData.authors));
    const invalidRefs = [];

    for (const plugin of pluginsBrowseData.plugins) {
      if (!authorIds.has(plugin.author_id)) {
        invalidRefs.push({
          plugin: plugin.name,
          author_id: plugin.author_id
        });
      }
    }

    assert.ok(
      invalidRefs.length === 0,
      `Found ${invalidRefs.length} plugins with invalid author_id references`
    );
  });

  it('should have matching author display names', function() {
    if (!pluginsBrowseData || !enrichedData) return this.skip();

    // Check a sample of plugins
    const sampleSize = Math.min(50, pluginsBrowseData.plugins.length);

    for (let i = 0; i < sampleSize; i++) {
      const plugin = pluginsBrowseData.plugins[i];
      const author = enrichedData.authors[plugin.author_id];

      if (author) {
        assert.strictEqual(
          plugin.author_display_name,
          author.display_name,
          `Display name mismatch for author ${plugin.author_id}`
        );
      }
    }
  });
});

describe('Data Flow: Marketplace Author References', () => {
  it('should have valid author_id references in marketplaces-browse', function() {
    if (!marketplacesBrowseData || !enrichedData) return this.skip();

    const authorIds = new Set(Object.keys(enrichedData.authors));
    const invalidRefs = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      if (!authorIds.has(marketplace.author_id)) {
        invalidRefs.push({
          marketplace: marketplace.name,
          author_id: marketplace.author_id
        });
      }
    }

    assert.ok(
      invalidRefs.length === 0,
      `Found ${invalidRefs.length} marketplaces with invalid author_id references`
    );
  });
});

describe('Data Flow: Cross-File Totals Validation', () => {
  it('should have consistent totals across all meta objects', function() {
    if (!indexData || !pluginsBrowseData || !marketplacesBrowseData) return this.skip();

    const metas = [
      { name: 'index', meta: indexData.meta },
      { name: 'plugins-browse', meta: pluginsBrowseData.meta },
      { name: 'marketplaces-browse', meta: marketplacesBrowseData.meta }
    ];

    const fields = ['total_authors', 'total_marketplaces', 'total_plugins', 'total_commands', 'total_skills'];

    for (const field of fields) {
      const values = metas.map(m => ({ name: m.name, value: m.meta[field] }));
      const uniqueValues = [...new Set(values.map(v => v.value))];

      assert.ok(
        uniqueValues.length === 1,
        `${field} mismatch: ${values.map(v => `${v.name}=${v.value}`).join(', ')}`
      );
    }
  });
});
