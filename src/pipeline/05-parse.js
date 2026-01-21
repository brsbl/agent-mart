import { parseJson } from '../lib/parser.js';
import { saveJson, loadJson, log, logError } from '../lib/utils.js';
import { validateMarketplace, logValidationResult } from '../lib/validator.js';

const INPUT_PATH = './data/04-files.json';
const OUTPUT_PATH = './data/05-parsed.json';

/**
 * Parse all fetched files into structured data
 * - marketplace.json files are parsed and validated
 * - All other files are stored as raw content indexed by path
 */
export function parse() {
  log('Starting file parsing...');

  const { files } = loadJson(INPUT_PATH);

  const parsed = {
    marketplaces: [],
    files: {} // { "repo_full_name": { "path/to/file": "content", ... } }
  };

  const validation = {
    marketplaces: { valid: 0, invalid: 0, errors: [] }
  };

  for (const file of files) {
    const { full_name, path, content } = file;
    const context = `${full_name}/${path}`;

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
      } else {
        // Store all other files as raw content
        if (!parsed.files[full_name]) {
          parsed.files[full_name] = {};
        }
        parsed.files[full_name][path] = content;
      }
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
      errors: validation.marketplaces.errors
    },
    ...parsed
  };

  saveJson(OUTPUT_PATH, output);

  // Log summary
  log(`Parsed: ${parsed.marketplaces.length} marketplaces, ${totalFiles} files across ${Object.keys(parsed.files).length} repos`);

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
