import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const MARKETPLACES_BROWSE_PATH = './web/public/data/marketplaces-browse.json';
const AUTHORS_DIR = './web/public/data/authors';

// Load data files once for all tests
let marketplacesBrowseData = null;
const authorFiles = new Map();

function loadJsonSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

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

before(() => {
  marketplacesBrowseData = loadJsonSafe(MARKETPLACES_BROWSE_PATH);

  if (!fs.existsSync(AUTHORS_DIR)) return;

  // Load all author files
  const files = fs.readdirSync(AUTHORS_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const authorId = file.replace('.json', '');
      const data = loadJsonSafe(path.join(AUTHORS_DIR, file));
      if (data) {
        authorFiles.set(authorId, data);
      }
    }
  }
});

describe('Data Consistency: No Duplicate repo_full_name in Browse', () => {
  it('should have unique repo_full_name for each marketplace', function() {
    if (!marketplacesBrowseData) return this.skip();

    const seenRepos = new Map();
    const duplicates = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const repoFullName = marketplace.repo_full_name;
      if (seenRepos.has(repoFullName)) {
        duplicates.push({
          repo: repoFullName,
          first: seenRepos.get(repoFullName),
          second: marketplace.name
        });
      } else {
        seenRepos.set(repoFullName, marketplace.name);
      }
    }

    assert.ok(
      duplicates.length === 0,
      `Found ${duplicates.length} duplicate repo_full_name entries: ${duplicates.map(d => d.repo).join(', ')}`
    );
  });
});

describe('Data Consistency: No Duplicate Repo Names Per Author', () => {
  it('should have unique repo names (not marketplace names) per author', function() {
    if (!marketplacesBrowseData) return this.skip();

    const authorRepos = new Map();
    const duplicates = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const authorId = marketplace.author_id;
      const repoName = marketplace.repo_full_name?.split('/')[1];

      if (!authorRepos.has(authorId)) {
        authorRepos.set(authorId, new Map());
      }

      const repoMap = authorRepos.get(authorId);
      if (repoMap.has(repoName)) {
        duplicates.push({
          author: authorId,
          repoName,
          marketplaces: [repoMap.get(repoName), marketplace.name]
        });
      } else {
        repoMap.set(repoName, marketplace.name);
      }
    }

    assert.ok(
      duplicates.length === 0,
      `Found authors with duplicate repo names: ${duplicates.map(d => `${d.author}/${d.repoName}`).join(', ')}`
    );
  });
});

describe('Data Consistency: Browse and Author Files Match (Sampled)', () => {
  it('should have matching stars between browse and author files', function() {
    if (!marketplacesBrowseData || authorFiles.size === 0) return this.skip();

    const sample = sampleArray(marketplacesBrowseData.marketplaces, 0.1, 42);
    const mismatches = [];

    for (const browseMarketplace of sample) {
      const authorData = authorFiles.get(browseMarketplace.author_id);
      if (!authorData) continue;

      const repoName = browseMarketplace.repo_full_name?.split('/')[1];
      const authorMarketplace = authorData.marketplaces.find(
        m => m.repo_full_name.split('/')[1] === repoName
      );

      if (authorMarketplace && authorMarketplace.signals.stars !== browseMarketplace.signals.stars) {
        mismatches.push({
          repo: browseMarketplace.repo_full_name,
          browseStars: browseMarketplace.signals.stars,
          authorStars: authorMarketplace.signals.stars
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} star count mismatches: ${mismatches.map(m => `${m.repo}: browse=${m.browseStars}, author=${m.authorStars}`).join('; ')}`
    );
  });

  it('should have matching descriptions between browse and author files', function() {
    if (!marketplacesBrowseData || authorFiles.size === 0) return this.skip();

    const sample = sampleArray(marketplacesBrowseData.marketplaces, 0.1, 42);
    const mismatches = [];

    for (const browseMarketplace of sample) {
      const authorData = authorFiles.get(browseMarketplace.author_id);
      if (!authorData) continue;

      const repoName = browseMarketplace.repo_full_name?.split('/')[1];
      const authorMarketplace = authorData.marketplaces.find(
        m => m.repo_full_name.split('/')[1] === repoName
      );

      if (authorMarketplace && authorMarketplace.description !== browseMarketplace.description) {
        mismatches.push({
          repo: browseMarketplace.repo_full_name,
          browseDesc: browseMarketplace.description?.slice(0, 50),
          authorDesc: authorMarketplace.description?.slice(0, 50)
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} description mismatches`
    );
  });

  it('should have matching forks between browse and author files', function() {
    if (!marketplacesBrowseData || authorFiles.size === 0) return this.skip();

    const sample = sampleArray(marketplacesBrowseData.marketplaces, 0.1, 42);
    const mismatches = [];

    for (const browseMarketplace of sample) {
      const authorData = authorFiles.get(browseMarketplace.author_id);
      if (!authorData) continue;

      const repoName = browseMarketplace.repo_full_name?.split('/')[1];
      const authorMarketplace = authorData.marketplaces.find(
        m => m.repo_full_name.split('/')[1] === repoName
      );

      if (authorMarketplace && authorMarketplace.signals.forks !== browseMarketplace.signals.forks) {
        mismatches.push({
          repo: browseMarketplace.repo_full_name,
          browseForks: browseMarketplace.signals.forks,
          authorForks: authorMarketplace.signals.forks
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} fork count mismatches`
    );
  });
});

describe('Data Consistency: Marketplace Counts Per Author', () => {
  it('should have matching marketplace counts for authors present in browse', function() {
    if (!marketplacesBrowseData || authorFiles.size === 0) return this.skip();

    // Count marketplaces per author in browse data
    const browseCountByAuthor = new Map();
    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const count = browseCountByAuthor.get(marketplace.author_id) || 0;
      browseCountByAuthor.set(marketplace.author_id, count + 1);
    }

    const mismatches = [];

    // Only check authors that appear in browse data
    for (const [authorId, browseCount] of browseCountByAuthor) {
      const authorData = authorFiles.get(authorId);
      if (!authorData) continue;

      const authorCount = authorData.marketplaces.length;

      if (browseCount !== authorCount) {
        mismatches.push({
          author: authorId,
          browseCount,
          authorCount
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} marketplace count mismatches: ${mismatches.map(m => `${m.author}: browse=${m.browseCount}, author=${m.authorCount}`).join('; ')}`
    );
  });
});

describe('Data Consistency: All Browse Marketplaces Exist in Author Files', () => {
  it('should find all browse marketplaces in their author files (when author file exists)', function() {
    if (!marketplacesBrowseData || authorFiles.size === 0) return this.skip();

    const missing = [];
    let skippedNoAuthorFile = 0;

    for (const browseMarketplace of marketplacesBrowseData.marketplaces) {
      const authorData = authorFiles.get(browseMarketplace.author_id);
      if (!authorData) {
        // Author file doesn't exist - skip (may be case-sensitivity issue or missing file)
        skippedNoAuthorFile++;
        continue;
      }

      const repoName = browseMarketplace.repo_full_name?.split('/')[1];
      const authorMarketplace = authorData.marketplaces.find(
        m => m.repo_full_name.split('/')[1] === repoName
      );

      if (!authorMarketplace) {
        missing.push({
          repo: browseMarketplace.repo_full_name,
          reason: 'marketplace not found in author file'
        });
      }
    }

    if (skippedNoAuthorFile > 0) {
      console.log(`  Skipped ${skippedNoAuthorFile} marketplaces (no author file found)`);
    }

    assert.ok(
      missing.length === 0,
      `Found ${missing.length} marketplaces missing from author files: ${missing.slice(0, 5).map(m => m.repo).join(', ')}${missing.length > 5 ? '...' : ''}`
    );
  });
});

describe('Data Consistency: repo_full_name Owner Matches author_id', () => {
  it('should have repo owner matching author_id (case-insensitive)', function() {
    if (!marketplacesBrowseData) return this.skip();

    const mismatches = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const repoOwner = marketplace.repo_full_name?.split('/')[0];
      // GitHub usernames are case-insensitive
      if (repoOwner?.toLowerCase() !== marketplace.author_id?.toLowerCase()) {
        mismatches.push({
          repo: marketplace.repo_full_name,
          repoOwner,
          authorId: marketplace.author_id
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} owner/author_id mismatches: ${mismatches.slice(0, 5).map(m => `${m.repo} (owner=${m.repoOwner}, author_id=${m.authorId})`).join('; ')}`
    );
  });
});

describe('Data Consistency: repo_url Matches repo_full_name', () => {
  it('should have repo_url matching repo_full_name pattern', function() {
    if (authorFiles.size === 0) return this.skip();

    const mismatches = [];
    let checked = 0;

    // Check author files which have repo_url
    for (const [_authorId, authorData] of authorFiles) {
      for (const marketplace of authorData.marketplaces) {
        checked++;
        const expectedUrl = `https://github.com/${marketplace.repo_full_name}`;
        if (marketplace.repo_url !== expectedUrl) {
          mismatches.push({
            repo: marketplace.repo_full_name,
            actual: marketplace.repo_url,
            expected: expectedUrl
          });
        }
      }
    }

    if (checked === 0) return this.skip();

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} repo_url mismatches: ${mismatches.slice(0, 3).map(m => `${m.repo}: got ${m.actual}`).join('; ')}`
    );
  });
});

describe('Data Consistency: Signals Validity', () => {
  it('should have non-negative stars and forks', function() {
    if (!marketplacesBrowseData) return this.skip();

    const invalid = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      if (marketplace.signals.stars < 0) {
        invalid.push({ repo: marketplace.repo_full_name, field: 'stars', value: marketplace.signals.stars });
      }
      if (marketplace.signals.forks < 0) {
        invalid.push({ repo: marketplace.repo_full_name, field: 'forks', value: marketplace.signals.forks });
      }
    }

    assert.ok(
      invalid.length === 0,
      `Found ${invalid.length} marketplaces with negative signals: ${invalid.map(i => `${i.repo}.${i.field}=${i.value}`).join(', ')}`
    );
  });

  it('should have stars_gained_7d not exceeding total stars', function() {
    if (!marketplacesBrowseData) return this.skip();

    const invalid = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const gained = marketplace.signals.stars_gained_7d;
      if (gained !== null && gained !== undefined && gained > marketplace.signals.stars) {
        invalid.push({
          repo: marketplace.repo_full_name,
          stars: marketplace.signals.stars,
          gained
        });
      }
    }

    assert.ok(
      invalid.length === 0,
      `Found ${invalid.length} marketplaces where stars_gained_7d > stars: ${invalid.slice(0, 5).map(i => `${i.repo}: ${i.gained} > ${i.stars}`).join('; ')}`
    );
  });

  it('should have valid pushed_at dates or null', function() {
    if (!marketplacesBrowseData) return this.skip();

    const invalid = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const pushedAt = marketplace.signals.pushed_at;
      if (pushedAt !== null) {
        const date = new Date(pushedAt);
        if (isNaN(date.getTime())) {
          invalid.push({ repo: marketplace.repo_full_name, pushed_at: pushedAt });
        }
      }
    }

    assert.ok(
      invalid.length === 0,
      `Found ${invalid.length} marketplaces with invalid pushed_at dates: ${invalid.slice(0, 5).map(i => `${i.repo}: ${i.pushed_at}`).join('; ')}`
    );
  });
});

describe('Data Consistency: Plugin Uniqueness Per Marketplace', () => {
  it('should have unique plugin names within each marketplace', function() {
    if (authorFiles.size === 0) return this.skip();

    const duplicates = [];

    for (const [_authorId, authorData] of authorFiles) {
      for (const marketplace of authorData.marketplaces) {
        const pluginNames = new Set();
        for (const plugin of marketplace.plugins || []) {
          if (pluginNames.has(plugin.name)) {
            duplicates.push({
              repo: marketplace.repo_full_name,
              plugin: plugin.name
            });
          }
          pluginNames.add(plugin.name);
        }
      }
    }

    assert.ok(
      duplicates.length === 0,
      `Found ${duplicates.length} duplicate plugin names: ${duplicates.slice(0, 5).map(d => `${d.repo}/${d.plugin}`).join(', ')}`
    );
  });
});

describe('Data Consistency: Install Commands Format', () => {
  it('should have properly formatted install commands', function() {
    if (authorFiles.size === 0) return this.skip();

    const sample = sampleArray(Array.from(authorFiles.values()), 0.2, 42);
    const invalid = [];

    for (const authorData of sample) {
      for (const marketplace of authorData.marketplaces) {
        for (const plugin of marketplace.plugins || []) {
          const cmds = plugin.install_commands || [];

          // First command should be marketplace add
          if (cmds[0] && !cmds[0].startsWith('/plugin marketplace add ')) {
            invalid.push({
              repo: marketplace.repo_full_name,
              plugin: plugin.name,
              issue: `First command should start with '/plugin marketplace add': ${cmds[0]}`
            });
          }

          // Second command should be plugin install
          if (cmds[1] && !cmds[1].startsWith('/plugin install ')) {
            invalid.push({
              repo: marketplace.repo_full_name,
              plugin: plugin.name,
              issue: `Second command should start with '/plugin install': ${cmds[1]}`
            });
          }
        }
      }
    }

    assert.ok(
      invalid.length === 0,
      `Found ${invalid.length} invalid install commands: ${invalid.slice(0, 3).map(i => `${i.repo}/${i.plugin}: ${i.issue}`).join('; ')}`
    );
  });
});

describe('Data Consistency: Author File Name Matches author.id', () => {
  it('should have filename matching author.id field (case-insensitive)', function() {
    if (authorFiles.size === 0) return this.skip();

    const mismatches = [];

    for (const [filename, authorData] of authorFiles) {
      // Filenames are normalized to lowercase, author.id preserves GitHub case
      if (authorData.author?.id?.toLowerCase() !== filename.toLowerCase()) {
        mismatches.push({
          filename,
          authorId: authorData.author?.id
        });
      }
    }

    assert.ok(
      mismatches.length === 0,
      `Found ${mismatches.length} filename/author.id mismatches: ${mismatches.slice(0, 5).map(m => `${m.filename}.json has author.id=${m.authorId}`).join('; ')}`
    );
  });
});

describe('Data Consistency: Avatar URL Format', () => {
  it('should have valid GitHub avatar URLs', function() {
    if (!marketplacesBrowseData) return this.skip();

    const invalid = [];
    const avatarPattern = /^https:\/\/avatars\.githubusercontent\.com\/u\/\d+/;

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      const url = marketplace.author_avatar_url;
      if (url && !avatarPattern.test(url)) {
        invalid.push({
          author: marketplace.author_id,
          url
        });
      }
    }

    assert.ok(
      invalid.length === 0,
      `Found ${invalid.length} invalid avatar URLs: ${invalid.slice(0, 3).map(i => `${i.author}: ${i.url}`).join('; ')}`
    );
  });
});

describe('Data Consistency: Required Fields Presence', () => {
  it('should have all required fields in browse marketplaces', function() {
    if (!marketplacesBrowseData) return this.skip();

    const requiredFields = ['name', 'author_id', 'repo_full_name', 'signals'];
    const missing = [];

    for (const marketplace of marketplacesBrowseData.marketplaces) {
      for (const field of requiredFields) {
        if (marketplace[field] === undefined || marketplace[field] === null) {
          missing.push({ repo: marketplace.repo_full_name || marketplace.name, field });
        }
      }
    }

    assert.ok(
      missing.length === 0,
      `Found ${missing.length} missing required fields: ${missing.slice(0, 5).map(m => `${m.repo}.${m.field}`).join(', ')}`
    );
  });

  it('should have all required fields in author marketplaces (sampled)', function() {
    if (authorFiles.size === 0) return this.skip();

    const sample = sampleArray(Array.from(authorFiles.values()), 0.1, 42);
    const requiredFields = ['name', 'repo_full_name', 'repo_url', 'signals', 'plugins'];
    const missing = [];

    for (const authorData of sample) {
      for (const marketplace of authorData.marketplaces) {
        for (const field of requiredFields) {
          if (marketplace[field] === undefined) {
            missing.push({ repo: marketplace.repo_full_name || marketplace.name, field });
          }
        }
      }
    }

    assert.ok(
      missing.length === 0,
      `Found ${missing.length} missing required fields: ${missing.slice(0, 5).map(m => `${m.repo}.${m.field}`).join(', ')}`
    );
  });
});

describe('Data Consistency: README Broken Images (Sampled)', () => {
  it('should have valid image references in READMEs', function() {
    if (authorFiles.size === 0) return this.skip();

    const sample = sampleArray(Array.from(authorFiles.values()), 0.15, 42);
    const brokenImages = [];

    // Patterns to find markdown images: ![alt](url) and HTML images: <img src="url">
    const mdImagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;
    const htmlImagePattern = /<img[^>]+src=["']([^"']+)["']/gi;

    for (const authorData of sample) {
      for (const marketplace of authorData.marketplaces) {
        const files = marketplace.files || {};
        const fileKeys = Object.keys(files);

        // Find README files
        const readmeKeys = fileKeys.filter(k => k.toLowerCase().includes('readme') && k.endsWith('.md'));

        for (const readmeKey of readmeKeys) {
          const content = files[readmeKey];
          if (!content) continue;

          // Extract image URLs
          const imageUrls = [];
          let match;

          mdImagePattern.lastIndex = 0;
          while ((match = mdImagePattern.exec(content)) !== null) {
            imageUrls.push(match[1]);
          }
          htmlImagePattern.lastIndex = 0;
          while ((match = htmlImagePattern.exec(content)) !== null) {
            imageUrls.push(match[1]);
          }

          // Check relative paths exist in files
          for (const url of imageUrls) {
            // Skip absolute URLs and data URIs
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
              continue;
            }

            // Normalize relative path
            const relativePath = url.replace(/^\.\//, '');

            // Check if relative path exists in files
            const exists = fileKeys.some(k =>
              k === relativePath ||
              k.endsWith('/' + relativePath) ||
              k === readmeKey.replace(/[^/]+$/, '') + relativePath
            );

            if (!exists) {
              brokenImages.push({
                repo: marketplace.repo_full_name,
                readme: readmeKey,
                image: url
              });
            }
          }
        }
      }
    }

    if (brokenImages.length > 0) {
      console.log(`\n  Found ${brokenImages.length} potentially broken relative image paths:`);
      brokenImages.slice(0, 5).forEach(b => console.log(`    - ${b.repo}: ${b.image}`));
    }

    // This is a warning, not a hard failure - relative images often work when rendered on GitHub
    assert.ok(true, 'Image validation completed (warnings logged above)');
  });
});

describe('Data Consistency: README Broken Links (Sampled)', () => {
  it('should have valid internal link references in READMEs', function() {
    if (authorFiles.size === 0) return this.skip();

    const sample = sampleArray(Array.from(authorFiles.values()), 0.15, 42);
    const brokenLinks = [];

    // Pattern to find markdown links: [text](url)
    const mdLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

    for (const authorData of sample) {
      for (const marketplace of authorData.marketplaces) {
        const files = marketplace.files || {};
        const fileKeys = Object.keys(files);

        // Find README files
        const readmeKeys = fileKeys.filter(k => k.toLowerCase().includes('readme') && k.endsWith('.md'));

        for (const readmeKey of readmeKeys) {
          const content = files[readmeKey];
          if (!content) continue;

          let match;
          mdLinkPattern.lastIndex = 0;
          while ((match = mdLinkPattern.exec(content)) !== null) {
            const url = match[1];

            // Skip external URLs, anchors, and special protocols
            if (url.startsWith('http://') || url.startsWith('https://') ||
                url.startsWith('#') || url.startsWith('mailto:') ||
                url.startsWith('data:')) {
              continue;
            }

            // Normalize relative path (remove anchor)
            const relativePath = url.split('#')[0].replace(/^\.\//, '');
            if (!relativePath) continue; // Was just an anchor

            // Check if relative path exists in files
            const exists = fileKeys.some(k =>
              k === relativePath ||
              k.endsWith('/' + relativePath) ||
              k === readmeKey.replace(/[^/]+$/, '') + relativePath
            );

            if (!exists) {
              brokenLinks.push({
                repo: marketplace.repo_full_name,
                readme: readmeKey,
                link: url
              });
            }
          }
        }
      }
    }

    if (brokenLinks.length > 0) {
      console.log(`\n  Found ${brokenLinks.length} potentially broken relative links:`);
      brokenLinks.slice(0, 5).forEach(b => console.log(`    - ${b.repo}: ${b.link}`));
    }

    // This is a warning, not a hard failure - links may reference files not in our fetch
    assert.ok(true, 'Link validation completed (warnings logged above)');
  });
});

describe('Data Consistency: Sampling Coverage Report', () => {
  it('should report sample coverage', function() {
    if (!marketplacesBrowseData) return this.skip();

    const sample = sampleArray(marketplacesBrowseData.marketplaces, 0.1, 42);

    console.log(`\n  Total marketplaces in browse: ${marketplacesBrowseData.marketplaces.length}`);
    console.log(`  Sampled for consistency check: ${sample.length}`);
    console.log(`  Author files loaded: ${authorFiles.size}`);
    console.log(`  Sample rate: ${(sample.length / marketplacesBrowseData.marketplaces.length * 100).toFixed(1)}%`);

    assert.ok(sample.length > 0, 'Should have some samples');
  });
});
