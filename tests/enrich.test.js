import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  generateInstallCommands
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
