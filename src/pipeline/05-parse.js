import { parseJson, parseFrontmatter, extractCommandName, extractSkillName } from '../lib/parser.js';
import { saveJson, loadJson, log, logError } from '../lib/utils.js';
import { validateMarketplace, validatePlugin, validateSkill, logValidationResult } from '../lib/validator.js';

const INPUT_PATH = './data/04-files.json';
const OUTPUT_PATH = './data/05-parsed.json';

/**
 * Parse all fetched files into structured data with validation
 */
export function parse() {
  log('Starting file parsing with validation...');

  const { files } = loadJson(INPUT_PATH);

  const parsed = {
    marketplaces: [],
    plugins: [],
    commands: [],
    skills: []
  };

  const validation = {
    marketplaces: { valid: 0, invalid: 0, errors: [] },
    plugins: { valid: 0, invalid: 0, errors: [] },
    commands: { valid: 0, invalid: 0, errors: [] },
    skills: { valid: 0, invalid: 0, errors: [] }
  };

  for (const file of files) {
    const { full_name, path, content } = file;
    const context = `${full_name}/${path}`;

    try {
      if (path.endsWith('marketplace.json')) {
        const data = parseJson(content, context);
        if (data) {
          const result = validateMarketplace(data, context);
          if (result.valid) {
            parsed.marketplaces.push({
              full_name,
              path,
              data
            });
            validation.marketplaces.valid++;
          } else {
            logValidationResult(result, 'marketplace', context);
            validation.marketplaces.invalid++;
            validation.marketplaces.errors.push({ context, errors: result.errors });
          }
        } else {
          validation.marketplaces.invalid++;
          validation.marketplaces.errors.push({ context, errors: ['Invalid JSON - failed to parse'] });
        }
      } else if (path.endsWith('plugin.json')) {
        const data = parseJson(content, context);
        if (data) {
          const result = validatePlugin(data, context);
          if (result.valid) {
            parsed.plugins.push({
              full_name,
              path,
              data
            });
            validation.plugins.valid++;
          } else {
            logValidationResult(result, 'plugin', context);
            validation.plugins.invalid++;
            validation.plugins.errors.push({ context, errors: result.errors });
          }
        } else {
          validation.plugins.invalid++;
          validation.plugins.errors.push({ context, errors: ['Invalid JSON - failed to parse'] });
        }
      } else if (path.includes('/commands/') && path.endsWith('.md')) {
        const { frontmatter, body } = parseFrontmatter(content);
        // Commands are always valid (frontmatter is optional per Claude Code spec)
        parsed.commands.push({
          full_name,
          path,
          name: extractCommandName(path),
          description: frontmatter?.description || null,
          frontmatter,
          content: body
        });
        validation.commands.valid++;
      } else if (path.endsWith('SKILL.md')) {
        const { frontmatter, body } = parseFrontmatter(content);
        const result = validateSkill(frontmatter, context);
        if (result.valid) {
          parsed.skills.push({
            full_name,
            path,
            name: extractSkillName(path, frontmatter),
            description: frontmatter?.description || null,
            frontmatter,
            content: body
          });
          validation.skills.valid++;
        } else {
          logValidationResult(result, 'skill', context);
          validation.skills.invalid++;
          validation.skills.errors.push({ context, errors: result.errors });
        }
      }
    } catch (error) {
      logError(`Failed to parse ${context}`, error);
    }
  }

  const output = {
    parsed_at: new Date().toISOString(),
    counts: {
      marketplaces: parsed.marketplaces.length,
      plugins: parsed.plugins.length,
      commands: parsed.commands.length,
      skills: parsed.skills.length
    },
    validation: {
      marketplaces: { valid: validation.marketplaces.valid, invalid: validation.marketplaces.invalid },
      plugins: { valid: validation.plugins.valid, invalid: validation.plugins.invalid },
      commands: { valid: validation.commands.valid, invalid: validation.commands.invalid },
      skills: { valid: validation.skills.valid, invalid: validation.skills.invalid },
      errors: [
        ...validation.marketplaces.errors,
        ...validation.plugins.errors,
        ...validation.commands.errors,
        ...validation.skills.errors
      ]
    },
    ...parsed
  };

  saveJson(OUTPUT_PATH, output);

  // Log summary
  log(`Parsed: ${parsed.marketplaces.length} marketplaces, ${parsed.plugins.length} plugins, ${parsed.commands.length} commands, ${parsed.skills.length} skills`);

  const totalInvalid = validation.marketplaces.invalid + validation.plugins.invalid + validation.skills.invalid;
  if (totalInvalid > 0) {
    log(`Validation: ${totalInvalid} resources excluded (${validation.marketplaces.invalid} marketplaces, ${validation.plugins.invalid} plugins, ${validation.skills.invalid} skills)`);
  }

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    parse();
  } catch (error) {
    console.error(error);
  }
}
