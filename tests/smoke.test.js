import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import validators
import { validateMarketplace, validatePlugin, validateSkill } from '../src/lib/validator.js';
import { parseJson, parseFrontmatter, extractCommandName, extractSkillName, normalizeSourcePath } from '../src/lib/parser.js';

describe('Validator: marketplace.json', () => {
  it('should pass with valid marketplace', () => {
    const data = {
      name: 'my-marketplace',
      plugins: [
        { name: 'plugin1', source: './plugins/plugin1' }
      ]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should fail without name', () => {
    const data = {
      plugins: [{ name: 'plugin1', source: './plugins/plugin1' }]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('should fail without plugins array', () => {
    const data = { name: 'my-marketplace' };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('plugins')));
  });

  it('should fail if plugin missing name', () => {
    const data = {
      name: 'my-marketplace',
      plugins: [{ source: './plugins/plugin1' }]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('should fail if plugin missing source', () => {
    const data = {
      name: 'my-marketplace',
      plugins: [{ name: 'plugin1' }]
    };
    const result = validateMarketplace(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('source')));
  });
});

describe('Validator: plugin.json', () => {
  it('should pass with valid plugin', () => {
    const data = { name: 'my-plugin' };
    const result = validatePlugin(data);
    assert.strictEqual(result.valid, true);
  });

  it('should fail without name', () => {
    const data = { description: 'A plugin' };
    const result = validatePlugin(data);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });
});

describe('Validator: SKILL.md', () => {
  it('should pass with valid frontmatter', () => {
    const frontmatter = {
      name: 'my-skill',
      description: 'Does something useful'
    };
    const result = validateSkill(frontmatter);
    assert.strictEqual(result.valid, true);
  });

  it('should fail without name', () => {
    const frontmatter = { description: 'Does something useful' };
    const result = validateSkill(frontmatter);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('name')));
  });

  it('should fail without description', () => {
    const frontmatter = { name: 'my-skill' };
    const result = validateSkill(frontmatter);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('description')));
  });

  it('should fail with null frontmatter', () => {
    const result = validateSkill(null);
    assert.strictEqual(result.valid, false);
  });
});

describe('Parser: JSON', () => {
  it('should parse valid JSON', () => {
    const result = parseJson('{"name": "test"}');
    assert.deepStrictEqual(result, { name: 'test' });
  });

  it('should return null for invalid JSON', () => {
    const result = parseJson('not json');
    assert.strictEqual(result, null);
  });
});

describe('Parser: Frontmatter', () => {
  it('should parse YAML frontmatter', () => {
    const content = `---
name: test
description: A test skill
---

# Content here`;
    const { frontmatter, body } = parseFrontmatter(content);
    assert.strictEqual(frontmatter.name, 'test');
    assert.strictEqual(frontmatter.description, 'A test skill');
    assert.ok(body.includes('# Content here'));
  });

  it('should handle missing frontmatter', () => {
    const content = '# Just markdown';
    const { frontmatter, body } = parseFrontmatter(content);
    assert.strictEqual(frontmatter, null);
    assert.strictEqual(body, content);
  });
});

describe('Parser: extractCommandName', () => {
  it('should extract command name from path', () => {
    const name = extractCommandName('plugins/foo/commands/my-command.md');
    assert.strictEqual(name, '/my-command');
  });

  it('should handle empty path', () => {
    const name = extractCommandName('');
    assert.strictEqual(name, '/unknown');
  });
});

describe('Parser: extractSkillName', () => {
  it('should use frontmatter name if present', () => {
    const name = extractSkillName('any/path/SKILL.md', { name: 'Custom Name' });
    assert.strictEqual(name, 'Custom Name');
  });

  it('should extract from path if no frontmatter', () => {
    const name = extractSkillName('plugins/skills/my-skill/SKILL.md', null);
    assert.strictEqual(name, 'my-skill');
  });
});

describe('Parser: normalizeSourcePath', () => {
  it('should remove leading ./', () => {
    const path = normalizeSourcePath('./plugins/foo');
    assert.strictEqual(path, 'plugins/foo');
  });

  it('should leave paths without ./ unchanged', () => {
    const path = normalizeSourcePath('plugins/foo');
    assert.strictEqual(path, 'plugins/foo');
  });
});
