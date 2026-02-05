import { parseJson, parseFrontmatter } from '../lib/parser.js';
import { saveJson, loadJson, log, logError } from '../lib/utils.js';
import { validateMarketplace, validateSkill, logValidationResult } from '../lib/validator.js';

const INPUT_PATH = './data/02-files.json';
const OUTPUT_PATH = './data/03-parsed.json';

/**
 * Check if a path is a SKILL.md file
 */
function isSkillFile(path) {
  return path === 'SKILL.md' || path.endsWith('/SKILL.md');
}

/**
 * Check if a path is a command file (*.md in a commands/ directory)
 */
function isCommandFile(path) {
  return (path.startsWith('commands/') || path.includes('/commands/')) &&
         path.endsWith('.md') &&
         !path.endsWith('README.md');
}

/**
 * Parse all fetched files into structured data
 * - marketplace.json files are parsed and validated
 * - SKILL.md files are parsed for frontmatter and validated
 * - command/*.md files are counted
 * - All files are stored as raw content indexed by path
 */
export function parse({ onProgress } = {}) {
  log('Starting file parsing...');

  const { files } = loadJson(INPUT_PATH);

  const parsed = {
    marketplaces: [],
    files: {} // { "repo_full_name": { "path/to/file": "content", ... } }
  };

  const validation = {
    marketplaces: { valid: 0, invalid: 0, errors: [] },
    skills: { valid: 0, invalid: 0, errors: [] },
    commands: { valid: 0, invalid: 0, errors: [] }
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { full_name, path, content } = file;
    const context = `${full_name}/${path}`;

    onProgress?.(i + 1, files.length);

    try {
      if (path.endsWith('marketplace.json')) {
        // Parse and validate marketplace.json
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
      } else if (isSkillFile(path)) {
        // Parse and validate SKILL.md
        const { frontmatter } = parseFrontmatter(content);
        const result = validateSkill(frontmatter, context);
        if (result.valid) {
          validation.skills.valid++;
        } else {
          logValidationResult(result, 'skill', context);
          validation.skills.invalid++;
          validation.skills.errors.push({ context, errors: result.errors });
        }
      } else if (isCommandFile(path)) {
        // Count commands (basic validation - file exists and is non-empty)
        if (content && content.trim().length > 0) {
          validation.commands.valid++;
        } else {
          validation.commands.invalid++;
        }
      }

      // Store all files as raw content
      if (!parsed.files[full_name]) {
        parsed.files[full_name] = {};
      }
      parsed.files[full_name][path] = content;

    } catch (error) {
      logError(`Failed to parse ${context}`, error);
    }
  }

  // Count total files stored
  const totalFiles = Object.values(parsed.files).reduce(
    (sum, repoFiles) => sum + Object.keys(repoFiles).length,
    0
  );

  const output = {
    parsed_at: new Date().toISOString(),
    counts: {
      marketplaces: parsed.marketplaces.length,
      files: totalFiles
    },
    validation: {
      marketplaces: { valid: validation.marketplaces.valid, invalid: validation.marketplaces.invalid },
      skills: { valid: validation.skills.valid, invalid: validation.skills.invalid },
      commands: { valid: validation.commands.valid, invalid: validation.commands.invalid },
      errors: validation.marketplaces.errors
    },
    ...parsed
  };

  saveJson(OUTPUT_PATH, output);

  // Log summary
  log(`Parsed: ${parsed.marketplaces.length} marketplaces, ${totalFiles} files across ${Object.keys(parsed.files).length} repos`);
  log(`Skills: ${validation.skills.valid} valid, ${validation.skills.invalid} invalid`);
  log(`Commands: ${validation.commands.valid} valid`);

  const totalInvalid = validation.marketplaces.invalid;
  if (totalInvalid > 0) {
    log(`Validation: ${totalInvalid} marketplaces excluded`);
  }

  return output;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    parse();
  } catch (error) {
    logError('Parse failed', error);
  }
}
