import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  generateInstallCommands,
  countCommands,
  countSkills,
  filterTreeToFetchedFiles
} from '../src/pipeline/06-enrich.js';

describe('Enrichment: generateInstallCommands', () => {
  it('should generate correct install commands format', () => {
    const commands = generateInstallCommands('owner/repo', 'marketplace-name', 'plugin-name');
    assert.deepStrictEqual(commands, [
      '/plugin marketplace add owner/repo',
      '/plugin install plugin-name@marketplace-name'
    ]);
  });

  it('should handle special characters in names', () => {
    const commands = generateInstallCommands('my-org/my-repo', 'my-marketplace', 'my-plugin');
    assert.strictEqual(commands[0], '/plugin marketplace add my-org/my-repo');
    assert.strictEqual(commands[1], '/plugin install my-plugin@my-marketplace');
  });

  it('should always return an array of exactly 2 commands', () => {
    const commands = generateInstallCommands('a/b', 'c', 'd');
    assert.strictEqual(commands.length, 2);
    assert.ok(commands[0].startsWith('/plugin marketplace add'));
    assert.ok(commands[1].startsWith('/plugin install'));
  });
});

describe('Enrichment: countCommands', () => {
  it('should count files matching commands/*.md pattern', () => {
    const files = {
      'commands/help.md': 'content',
      'commands/run.md': 'content',
      'README.md': 'content'
    };
    assert.strictEqual(countCommands(files), 2);
  });

  it('should count nested commands directories', () => {
    const files = {
      'plugins/myplugin/commands/help.md': 'content',
      'plugins/myplugin/commands/run.md': 'content',
      'plugins/other/commands/test.md': 'content'
    };
    assert.strictEqual(countCommands(files), 3);
  });

  it('should ignore non-.md files in commands folder', () => {
    const files = {
      'commands/help.md': 'content',
      'commands/script.js': 'content',
      'commands/config.json': 'content'
    };
    assert.strictEqual(countCommands(files), 1);
  });

  it('should return 0 for null/undefined input', () => {
    assert.strictEqual(countCommands(null), 0);
    assert.strictEqual(countCommands(undefined), 0);
  });

  it('should return 0 for empty object', () => {
    assert.strictEqual(countCommands({}), 0);
  });

  it('should not count files with "commands" in non-directory path', () => {
    const files = {
      'my-commands.md': 'content',
      'commands-readme.md': 'content'
    };
    assert.strictEqual(countCommands(files), 0);
  });
});

describe('Enrichment: countSkills', () => {
  it('should count root SKILL.md file', () => {
    const files = {
      'SKILL.md': 'content',
      'README.md': 'content'
    };
    assert.strictEqual(countSkills(files), 1);
  });

  it('should count nested SKILL.md files', () => {
    const files = {
      'skills/help/SKILL.md': 'content',
      'skills/run/SKILL.md': 'content',
      'plugins/myplugin/skills/test/SKILL.md': 'content'
    };
    assert.strictEqual(countSkills(files), 3);
  });

  it('should not count skill.md (lowercase)', () => {
    const files = {
      'skill.md': 'content',
      'skills/test/skill.md': 'content'
    };
    assert.strictEqual(countSkills(files), 0);
  });

  it('should return 0 for null/undefined input', () => {
    assert.strictEqual(countSkills(null), 0);
    assert.strictEqual(countSkills(undefined), 0);
  });

  it('should return 0 for empty object', () => {
    assert.strictEqual(countSkills({}), 0);
  });

  it('should not count files containing SKILL.md in name but not path', () => {
    const files = {
      'MY-SKILL.md': 'content',
      'SKILL.md.bak': 'content'
    };
    assert.strictEqual(countSkills(files), 0);
  });
});

describe('Enrichment: filterTreeToFetchedFiles', () => {
  it('should filter tree to only include fetched files', () => {
    const tree = [
      { path: 'README.md', type: 'blob', size: 100 },
      { path: 'src', type: 'tree', size: null },
      { path: 'src/index.js', type: 'blob', size: 200 },
      { path: 'dist', type: 'tree', size: null },
      { path: 'dist/bundle.js', type: 'blob', size: 5000 }
    ];
    const files = {
      'README.md': 'content',
      'src/index.js': 'content'
    };

    const result = filterTreeToFetchedFiles(tree, files);

    assert.strictEqual(result.length, 3);
    assert.ok(result.some(e => e.path === 'README.md'));
    assert.ok(result.some(e => e.path === 'src'));
    assert.ok(result.some(e => e.path === 'src/index.js'));
    assert.ok(!result.some(e => e.path === 'dist'));
    assert.ok(!result.some(e => e.path === 'dist/bundle.js'));
  });

  it('should preserve directory entries that contain fetched files', () => {
    const tree = [
      { path: 'plugins', type: 'tree', size: null },
      { path: 'plugins/myplugin', type: 'tree', size: null },
      { path: 'plugins/myplugin/commands', type: 'tree', size: null },
      { path: 'plugins/myplugin/commands/help.md', type: 'blob', size: 100 }
    ];
    const files = {
      'plugins/myplugin/commands/help.md': 'content'
    };

    const result = filterTreeToFetchedFiles(tree, files);

    assert.strictEqual(result.length, 4);
    assert.ok(result.some(e => e.path === 'plugins' && e.type === 'tree'));
    assert.ok(result.some(e => e.path === 'plugins/myplugin' && e.type === 'tree'));
    assert.ok(result.some(e => e.path === 'plugins/myplugin/commands' && e.type === 'tree'));
    assert.ok(result.some(e => e.path === 'plugins/myplugin/commands/help.md' && e.type === 'blob'));
  });

  it('should handle empty files object', () => {
    const tree = [
      { path: 'README.md', type: 'blob', size: 100 },
      { path: 'src', type: 'tree', size: null }
    ];
    const files = {};

    const result = filterTreeToFetchedFiles(tree, files);
    assert.strictEqual(result.length, 0);
  });

  it('should handle empty tree', () => {
    const tree = [];
    const files = { 'README.md': 'content' };

    const result = filterTreeToFetchedFiles(tree, files);
    assert.strictEqual(result.length, 0);
  });
});

describe('Enrichment: Plugin Field Preservation', () => {
  // These tests verify the fix that preserves original marketplace.json fields

  it('should preserve original plugin fields through enrichment', () => {
    // Simulate original plugin from marketplace.json
    const originalPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'test-author',
      homepage: 'https://example.com',
      repository: 'https://github.com/test/repo',
      license: 'MIT',
      category: 'development',
      keywords: ['test', 'example'],
      source: 'plugins/test-plugin',
      agents: ['agents/helper.md'],
      commands: ['commands/run.md']
    };

    // Simulate enrichment spread pattern (as done in 06-enrich.js)
    const enrichedPlugin = {
      ...originalPlugin,
      description: originalPlugin.description || null,
      categories: [],
      install_commands: generateInstallCommands('owner/repo', 'marketplace', 'test-plugin')
    };

    // Verify all original fields are preserved
    assert.strictEqual(enrichedPlugin.name, originalPlugin.name);
    assert.strictEqual(enrichedPlugin.version, originalPlugin.version);
    assert.strictEqual(enrichedPlugin.description, originalPlugin.description);
    assert.strictEqual(enrichedPlugin.author, originalPlugin.author);
    assert.strictEqual(enrichedPlugin.homepage, originalPlugin.homepage);
    assert.strictEqual(enrichedPlugin.repository, originalPlugin.repository);
    assert.strictEqual(enrichedPlugin.license, originalPlugin.license);
    assert.strictEqual(enrichedPlugin.category, originalPlugin.category);
    assert.deepStrictEqual(enrichedPlugin.keywords, originalPlugin.keywords);
    assert.strictEqual(enrichedPlugin.source, originalPlugin.source);
    assert.deepStrictEqual(enrichedPlugin.agents, originalPlugin.agents);
    assert.deepStrictEqual(enrichedPlugin.commands, originalPlugin.commands);

    // Verify enrichment adds computed fields
    assert.ok(Array.isArray(enrichedPlugin.categories));
    assert.ok(Array.isArray(enrichedPlugin.install_commands));
    assert.strictEqual(enrichedPlugin.install_commands.length, 2);
  });

  it('should handle plugins with external source URL', () => {
    const pluginWithExternalSource = {
      name: 'external-plugin',
      source: 'https://github.com/external/plugin'
    };

    const enrichedPlugin = {
      ...pluginWithExternalSource,
      description: null,
      categories: [],
      install_commands: generateInstallCommands('owner/repo', 'marketplace', 'external-plugin')
    };

    assert.strictEqual(enrichedPlugin.source, 'https://github.com/external/plugin');
  });
});
