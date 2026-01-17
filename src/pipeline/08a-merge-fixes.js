import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const FIXES_DIR = join(DATA_DIR, 'analysis-fixes');
const ANALYSIS_PATH = join(DATA_DIR, 'marketplace-detailed-analysis.json');

async function loadJSON(filepath) {
  const content = await readFile(filepath, 'utf-8');
  return JSON.parse(content);
}

export async function mergeFixes() {
  console.log('Loading original analysis...');
  const analysis = await loadJSON(ANALYSIS_PATH);

  // Create a map for quick lookup
  const analysisMap = new Map();
  for (const item of analysis) {
    analysisMap.set(item.repo, item);
  }

  // Load all fix files
  const fixFiles = await readdir(FIXES_DIR);
  const jsonFiles = fixFiles.filter(f => f.endsWith('.json'));

  let totalFixes = 0;
  let tagFixes = 0;
  let integrationFixes = 0;

  for (const file of jsonFiles) {
    console.log(`Processing ${file}...`);
    const fixes = await loadJSON(join(FIXES_DIR, file));

    for (const fix of fixes) {
      const existing = analysisMap.get(fix.repo);
      if (existing) {
        // Apply stage_lifecycle_arch fixes
        if (fix.stage_lifecycle_arch && fix.stage_lifecycle_arch.length > 0) {
          existing.stage_lifecycle_arch = fix.stage_lifecycle_arch;
          tagFixes++;
        }

        // Apply integration fixes
        if (fix.integration !== undefined) {
          existing.integration = fix.integration;
          integrationFixes++;
        }

        totalFixes++;
      } else {
        console.log(`  Warning: repo not found: ${fix.repo}`);
      }
    }
  }

  // Convert map back to array
  const updatedAnalysis = Array.from(analysisMap.values());

  // Write updated analysis
  await writeFile(ANALYSIS_PATH, JSON.stringify(updatedAnalysis, null, 2));

  console.log('\nMerge complete!');
  console.log(`  Total fixes applied: ${totalFixes}`);
  console.log(`  Tag fixes: ${tagFixes}`);
  console.log(`  Integration fixes: ${integrationFixes}`);
  console.log(`  Output: ${ANALYSIS_PATH}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mergeFixes().catch(console.error);
}
