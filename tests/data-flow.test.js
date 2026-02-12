import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const DISCOVERED_PATH = './data/01-discovered.json';
const REPOS_PATH = './data/02-repos.json';
const ENRICHED_PATH = './data/06-enriched.json';
const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';
const AUTHORS_DIR = './web/public/data/authors';

// Load data files once for all tests
let discoveredData = null;
let reposData = null;
let enrichedData = null;
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
  discoveredData = loadJsonSafe(DISCOVERED_PATH);
  reposData = loadJsonSafe(REPOS_PATH);
  enrichedData = loadJsonSafe(ENRICHED_PATH);
  marketplacesBrowseData = loadJsonSafe(MARKETPLACES_BROWSE_PATH);
});

describe('Data Flow: Pipeline Drop Tracking', () => {
  it('should only drop repos for acceptable reasons (deletion or invalid marketplace.json)', function() {
    if (!reposData || !enrichedData) return this.skip();

    // Collect all drops across pipeline steps
    const allDrops = [
      ...(reposData.dropped_repos || []).map(d => ({ ...d, step: 'fetch-repos' })),
      ...(enrichedData.dropped_repos || []).map(d => ({ ...d, step: 'enrich' })),
    ];

    const filesData = loadJsonSafe('./data/04-files.json');
    if (filesData) {
      allDrops.push(...(filesData.dropped_repos || []).map(d => ({ ...d, step: 'fetch-files' })));
    }

    const acceptable = d =>
      d.reason.includes('404') ||
      d.reason.includes('no valid marketplace.json');

    const badDrops = allDrops.filter(d => !acceptable(d));

    if (allDrops.length > 0) {
      const deletions = allDrops.filter(d => d.reason.includes('404'));
      const invalid = allDrops.filter(d => d.reason.includes('no valid marketplace.json'));
      console.log(`  Deletions: ${deletions.length}, Invalid marketplace.json: ${invalid.length}, Unacceptable: ${badDrops.length}`);
    }

    assert.strictEqual(
      badDrops.length,
      0,
      `${badDrops.length} repos dropped for unacceptable reasons: ${badDrops.map(d => `${d.full_name} [${d.step}] (${d.reason})`).join(', ')}`
    );
  });

  it('should have every discovered repo in browse output or dropped for an acceptable reason', function() {
    if (!discoveredData || !marketplacesBrowseData || !reposData || !enrichedData) return this.skip();

    // Repos present in the final output
    const outputRepos = new Set(
      marketplacesBrowseData.marketplaces.map(m => m.repo_full_name)
    );

    // Repos dropped for acceptable reasons across all steps
    const acceptablyDropped = new Set();

    for (const drops of [
      reposData.dropped_repos || [],
      enrichedData.dropped_repos || [],
    ]) {
      for (const d of drops) {
        if (d.reason.includes('404') || d.reason.includes('no valid marketplace.json')) {
          acceptablyDropped.add(d.full_name);
        }
      }
    }

    const filesData = loadJsonSafe('./data/04-files.json');
    if (filesData) {
      for (const d of filesData.dropped_repos || []) {
        if (d.reason.includes('404') || d.reason.includes('no valid marketplace.json')) {
          acceptablyDropped.add(d.full_name);
        }
      }
    }

    // Renames: a repo discovered as X may appear in output as Y
    const renames = reposData.renames || {};

    const missing = [];
    for (const repo of discoveredData.repos) {
      const name = repo.full_name;
      const renamedTo = renames[name];

      if (outputRepos.has(name)) continue;
      if (renamedTo && outputRepos.has(renamedTo)) continue;
      if (acceptablyDropped.has(name)) continue;

      missing.push(name);
    }

    assert.strictEqual(
      missing.length,
      0,
      `${missing.length} discovered repos missing from output without acceptable reason: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`
    );
  });
});

describe('Data Flow: Enriched to Marketplaces Browse Consistency', () => {
  it('should have matching author counts', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    const enrichedAuthorCount = Object.keys(enrichedData.authors).length;
    const browseAuthorCount = marketplacesBrowseData.meta.total_authors;

    assert.strictEqual(
      browseAuthorCount,
      enrichedAuthorCount,
      `Author count mismatch: enriched=${enrichedAuthorCount}, browse=${browseAuthorCount}`
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

  it('should have matching meta.total_marketplaces', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    // Count marketplaces in enriched data
    let enrichedMarketplaceCount = 0;
    for (const author of Object.values(enrichedData.authors)) {
      enrichedMarketplaceCount += author.marketplaces.length;
    }

    assert.strictEqual(
      marketplacesBrowseData.meta.total_marketplaces,
      enrichedMarketplaceCount,
      `total_marketplaces mismatch`
    );
  });
});

describe('Data Flow: Plugin Counts Consistency', () => {
  it('should have matching meta.total_plugins', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    // Count plugins in enriched data
    let enrichedPluginCount = 0;
    for (const author of Object.values(enrichedData.authors)) {
      for (const marketplace of author.marketplaces) {
        enrichedPluginCount += marketplace.plugins?.length || 0;
      }
    }

    assert.strictEqual(
      marketplacesBrowseData.meta.total_plugins,
      enrichedPluginCount,
      `Plugin count mismatch: enriched=${enrichedPluginCount}, browse=${marketplacesBrowseData.meta.total_plugins}`
    );
  });
});

describe('Data Flow: Author File Existence', () => {
  it('should have author files for all authors in enriched data', function() {
    if (!enrichedData) return this.skip();
    if (!fs.existsSync(AUTHORS_DIR)) return this.skip();

    const missingAuthors = [];

    for (const authorId of Object.keys(enrichedData.authors)) {
      const authorFile = path.join(AUTHORS_DIR, `${authorId}.json`);
      if (!fs.existsSync(authorFile)) {
        missingAuthors.push(authorId);
      }
    }

    assert.ok(
      missingAuthors.length === 0,
      `Missing author files: ${missingAuthors.slice(0, 10).join(', ')}${missingAuthors.length > 10 ? '...' : ''}`
    );
  });

  it('should have valid JSON in author files (sample)', function() {
    if (!enrichedData) return this.skip();
    if (!fs.existsSync(AUTHORS_DIR)) return this.skip();

    // Check first 10 authors
    const authorIds = Object.keys(enrichedData.authors);
    const sampleSize = Math.min(10, authorIds.length);

    for (let i = 0; i < sampleSize; i++) {
      const authorId = authorIds[i];
      const authorFile = path.join(AUTHORS_DIR, `${authorId}.json`);

      if (fs.existsSync(authorFile)) {
        const content = fs.readFileSync(authorFile, 'utf8');
        const parsed = JSON.parse(content); // Will throw if invalid

        assert.ok(parsed.author, `Author file ${authorId}.json missing author field`);
        assert.ok(parsed.marketplaces, `Author file ${authorId}.json missing marketplaces field`);
      }
    }
  });
});

describe('Data Flow: Every Enriched Author in Browse Data', () => {
  it('should have a browse entry for every enriched author', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    const browseAuthorIds = new Set(
      marketplacesBrowseData.marketplaces.map(m => m.author_id)
    );

    const missingAuthors = Object.keys(enrichedData.authors).filter(
      authorId => !browseAuthorIds.has(authorId)
    );

    assert.ok(
      missingAuthors.length === 0,
      `Enriched authors missing from browse data: ${missingAuthors.slice(0, 10).join(', ')}${missingAuthors.length > 10 ? '...' : ''}`
    );
  });

  it('should have all enriched marketplaces in browse data', function() {
    if (!enrichedData || !marketplacesBrowseData) return this.skip();

    const browseRepos = new Set(
      marketplacesBrowseData.marketplaces.map(m => m.repo_full_name)
    );

    const missing = [];
    for (const author of Object.values(enrichedData.authors)) {
      for (const marketplace of author.marketplaces) {
        if (!browseRepos.has(marketplace.repo_full_name)) {
          missing.push(marketplace.repo_full_name);
        }
      }
    }

    assert.ok(
      missing.length === 0,
      `Enriched marketplaces missing from browse: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`
    );
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

describe('Data Flow: Marketplaces Browse Meta Validation', () => {
  it('should have required meta fields', function() {
    if (!marketplacesBrowseData) return this.skip();

    const { meta } = marketplacesBrowseData;

    assert.ok(typeof meta.total_authors === 'number', 'meta.total_authors should be a number');
    assert.ok(typeof meta.total_marketplaces === 'number', 'meta.total_marketplaces should be a number');
    assert.ok(typeof meta.total_plugins === 'number', 'meta.total_plugins should be a number');
  });
});
