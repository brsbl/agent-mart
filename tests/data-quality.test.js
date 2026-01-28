import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const ENRICHED_PATH = './data/06-enriched.json';

// Deterministic seeded random for reproducibility
function seededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function sampleArray(array, rate = 0.1, seed = 42) {
  const random = seededRandom(seed);
  return array.filter(() => random() < rate);
}

// Load enriched data once for all tests
let enrichedData = null;
const allMarketplaces = [];

before(() => {
  if (!fs.existsSync(ENRICHED_PATH)) {
    console.log(`Skipping data quality tests: ${ENRICHED_PATH} not found`);
    return;
  }
  const content = fs.readFileSync(ENRICHED_PATH, 'utf8');
  enrichedData = JSON.parse(content);

  // Flatten marketplaces from all authors
  for (const author of Object.values(enrichedData.authors)) {
    for (const marketplace of author.marketplaces) {
      allMarketplaces.push({ ...marketplace, author_id: author.id });
    }
  }
});

describe('Data Quality: Seeded Random Sampling', () => {
  it('should produce deterministic results with same seed', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const sample1 = sampleArray(array, 0.5, 42);
    const sample2 = sampleArray(array, 0.5, 42);
    assert.deepStrictEqual(sample1, sample2);
  });

  it('should produce different results with different seeds', () => {
    const array = Array.from({ length: 100 }, (_, i) => i);
    const sample1 = sampleArray(array, 0.5, 42);
    const sample2 = sampleArray(array, 0.5, 123);
    assert.notDeepStrictEqual(sample1, sample2);
  });

  it('should sample approximately the correct rate', () => {
    const array = Array.from({ length: 1000 }, (_, i) => i);
    const sample = sampleArray(array, 0.1, 42);
    // Allow 5% variance (so 5-15% of 1000 = 50-150)
    assert.ok(sample.length >= 50, `Expected at least 50 samples, got ${sample.length}`);
    assert.ok(sample.length <= 150, `Expected at most 150 samples, got ${sample.length}`);
  });
});

describe('Data Quality: Marketplace Field Validation (10% Sample)', () => {
  it('should validate marketplace name field', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);
    for (const marketplace of sample) {
      assert.ok(
        typeof marketplace.name === 'string' && marketplace.name.length > 0,
        `Marketplace missing name: ${marketplace.repo_full_name}`
      );
    }
  });

  it('should validate repo_full_name format (owner/repo)', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);
    const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

    for (const marketplace of sample) {
      assert.ok(
        typeof marketplace.repo_full_name === 'string',
        `Marketplace repo_full_name must be a string: ${marketplace.name}`
      );
      assert.ok(
        pattern.test(marketplace.repo_full_name),
        `Invalid repo_full_name format: ${marketplace.repo_full_name}`
      );
    }
  });

  it('should validate repo_url starts with https://github.com/', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sample) {
      assert.ok(
        typeof marketplace.repo_url === 'string' &&
        marketplace.repo_url.startsWith('https://github.com/'),
        `Invalid repo_url: ${marketplace.repo_url}`
      );
    }
  });

  it('should validate signals object structure', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sample) {
      assert.ok(
        marketplace.signals && typeof marketplace.signals === 'object',
        `Marketplace missing signals object: ${marketplace.repo_full_name}`
      );
      assert.ok(
        typeof marketplace.signals.stars === 'number',
        `Invalid signals.stars for: ${marketplace.repo_full_name}`
      );
      assert.ok(
        typeof marketplace.signals.forks === 'number',
        `Invalid signals.forks for: ${marketplace.repo_full_name}`
      );
    }
  });

  it('should validate plugins array exists', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sample) {
      assert.ok(
        Array.isArray(marketplace.plugins),
        `Marketplace missing plugins array: ${marketplace.repo_full_name}`
      );
    }
  });

  it('should validate file_tree array exists', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sample) {
      assert.ok(
        Array.isArray(marketplace.file_tree),
        `Marketplace missing file_tree array: ${marketplace.repo_full_name}`
      );
    }
  });
});

describe('Data Quality: Plugin Field Validation (Sampled Marketplaces)', () => {
  it('should validate plugin name field', function() {
    if (!enrichedData) return this.skip();

    const sampledMarketplaces = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sampledMarketplaces) {
      for (const plugin of marketplace.plugins) {
        assert.ok(
          typeof plugin.name === 'string' && plugin.name.length > 0,
          `Plugin missing name in marketplace: ${marketplace.repo_full_name}`
        );
      }
    }
  });

  it('should validate plugin source field (string or object)', function() {
    if (!enrichedData) return this.skip();

    const sampledMarketplaces = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sampledMarketplaces) {
      for (const plugin of marketplace.plugins) {
        // source can be string (path) or object (external URL config)
        const validSource =
          typeof plugin.source === 'string' ||
          (plugin.source && typeof plugin.source === 'object') ||
          plugin.source === undefined; // Some plugins may not have explicit source

        assert.ok(
          validSource,
          `Invalid plugin source type for ${plugin.name} in ${marketplace.repo_full_name}`
        );
      }
    }
  });

  it('should validate install_commands is array of 2 strings', function() {
    if (!enrichedData) return this.skip();

    const sampledMarketplaces = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sampledMarketplaces) {
      for (const plugin of marketplace.plugins) {
        assert.ok(
          Array.isArray(plugin.install_commands),
          `Plugin ${plugin.name} missing install_commands array`
        );
        assert.strictEqual(
          plugin.install_commands.length,
          2,
          `Plugin ${plugin.name} should have exactly 2 install commands`
        );
        assert.ok(
          plugin.install_commands[0].startsWith('/plugin marketplace add'),
          `First install command should be marketplace add: ${plugin.name}`
        );
        assert.ok(
          plugin.install_commands[1].startsWith('/plugin install'),
          `Second install command should be plugin install: ${plugin.name}`
        );
      }
    }
  });

  it('should validate categories is array', function() {
    if (!enrichedData) return this.skip();

    const sampledMarketplaces = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sampledMarketplaces) {
      for (const plugin of marketplace.plugins) {
        assert.ok(
          Array.isArray(plugin.categories),
          `Plugin ${plugin.name} categories should be array`
        );
      }
    }
  });

  it('should validate description is string or null', function() {
    if (!enrichedData) return this.skip();

    const sampledMarketplaces = sampleArray(allMarketplaces, 0.1, 42);

    for (const marketplace of sampledMarketplaces) {
      for (const plugin of marketplace.plugins) {
        assert.ok(
          plugin.description === null || typeof plugin.description === 'string',
          `Plugin ${plugin.name} description should be string or null`
        );
      }
    }
  });
});

describe('Data Quality: Author Stats Consistency', () => {
  it('should verify total_plugins matches actual count', function() {
    if (!enrichedData) return this.skip();

    const sampledAuthors = sampleArray(Object.values(enrichedData.authors), 0.1, 42);

    for (const author of sampledAuthors) {
      const actualPluginCount = author.marketplaces.reduce(
        (sum, m) => sum + (m.plugins?.length || 0),
        0
      );
      assert.strictEqual(
        author.stats.total_plugins,
        actualPluginCount,
        `Author ${author.id} total_plugins mismatch: expected ${actualPluginCount}, got ${author.stats.total_plugins}`
      );
    }
  });

  it('should verify total_marketplaces matches actual count', function() {
    if (!enrichedData) return this.skip();

    const sampledAuthors = sampleArray(Object.values(enrichedData.authors), 0.1, 42);

    for (const author of sampledAuthors) {
      assert.strictEqual(
        author.stats.total_marketplaces,
        author.marketplaces.length,
        `Author ${author.id} total_marketplaces mismatch: expected ${author.marketplaces.length}, got ${author.stats.total_marketplaces}`
      );
    }
  });

  it('should verify stars/forks are non-negative', function() {
    if (!enrichedData) return this.skip();

    const sampledAuthors = sampleArray(Object.values(enrichedData.authors), 0.1, 42);

    for (const author of sampledAuthors) {
      assert.ok(
        author.stats.total_stars >= 0,
        `Author ${author.id} has negative stars`
      );
      assert.ok(
        author.stats.total_forks >= 0,
        `Author ${author.id} has negative forks`
      );
    }
  });
});

describe('Data Quality: Sampling Coverage Report', () => {
  it('should report sample size (10% of marketplaces)', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);
    const expectedMin = Math.floor(allMarketplaces.length * 0.05);
    const expectedMax = Math.ceil(allMarketplaces.length * 0.15);

    console.log(`\n  Total marketplaces: ${allMarketplaces.length}`);
    console.log(`  Sampled marketplaces: ${sample.length}`);
    console.log(`  Sample rate: ${(sample.length / allMarketplaces.length * 100).toFixed(1)}%`);

    assert.ok(
      sample.length >= expectedMin && sample.length <= expectedMax,
      `Sample size ${sample.length} outside expected range [${expectedMin}, ${expectedMax}]`
    );
  });

  it('should report total plugins validated in sample', function() {
    if (!enrichedData) return this.skip();

    const sample = sampleArray(allMarketplaces, 0.1, 42);
    const totalPlugins = sample.reduce((sum, m) => sum + (m.plugins?.length || 0), 0);

    console.log(`\n  Total plugins in sample: ${totalPlugins}`);

    assert.ok(totalPlugins > 0, 'Sample should contain at least some plugins');
  });
});
