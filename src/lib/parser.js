import yaml from 'js-yaml';
import { logError } from './utils.js';

/**
 * Parse JSON string safely
 * @param {string} content - JSON string
 * @param {string} context - Context for error messages
 * @returns {Object|null} Parsed object or null
 */
export function parseJson(content, context = '') {
  try {
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to parse JSON: ${context}`, error);
    return null;
  }
}

/**
 * Parse YAML frontmatter from markdown file
 * @param {string} content - Markdown content
 * @returns {{ frontmatter: Object|null, body: string }} Parsed frontmatter and body
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  try {
    const frontmatter = yaml.load(match[1]);
    const body = match[2].trim();
    return { frontmatter, body };
  } catch (error) {
    logError('Failed to parse YAML frontmatter', error);
    return { frontmatter: null, body: content };
  }
}

/**
 * Extract command name from file path
 * @param {string} filePath - Path like "plugin/commands/my-command.md"
 * @returns {string} Command name like "/my-command"
 */
export function extractCommandName(filePath) {
  if (filePath == null || filePath === '') {
    return '/unknown';
  }

  const filename = filePath.split('/').pop();
  if (!filename) {
    return '/unknown';
  }

  const name = filename.replace(/\.md$/, '');
  return `/${name}`;
}

/**
 * Extract skill name from file path or frontmatter
 * @param {string} filePath - Path like "plugin/skills/my-skill/SKILL.md"
 * @param {Object|null} frontmatter - Parsed frontmatter
 * @returns {string} Skill name
 */
export function extractSkillName(filePath, frontmatter) {
  if (frontmatter?.name) {
    return frontmatter.name;
  }

  if (filePath == null || filePath === '') {
    return 'unknown-skill';
  }

  // Extract from path: "skills/my-skill/SKILL.md" -> "my-skill"
  const parts = filePath.split('/');
  const skillIndex = parts.findIndex(p => p === 'skills' || p === 'SKILL.md');

  if (skillIndex >= 0 && parts[skillIndex] === 'skills' && parts[skillIndex + 1]) {
    return parts[skillIndex + 1];
  }

  // Fallback: parent directory of SKILL.md
  const skillMdIndex = parts.indexOf('SKILL.md');
  if (skillMdIndex > 0) {
    return parts[skillMdIndex - 1];
  }

  return 'unknown-skill';
}

/**
 * Normalize plugin source path
 * @param {string} source - Source like "./plugins/foo" or "plugins/foo"
 * @returns {string} Normalized path like "plugins/foo"
 */
export function normalizeSourcePath(source) {
  if (!source || typeof source !== 'string') {
    return '';
  }
  return source.replace(/^\.\//, '');
}
