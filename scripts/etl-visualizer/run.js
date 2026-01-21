import { existsSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { discover } from '../../src/pipeline/01-discover.js';
import { fetchRepos } from '../../src/pipeline/02-fetch-repos.js';
import { fetchTrees } from '../../src/pipeline/03-fetch-trees.js';
import { fetchFiles } from '../../src/pipeline/04-fetch-files.js';
import { parse } from '../../src/pipeline/05-parse.js';
import { enrich } from '../../src/pipeline/06-enrich.js';
import { output } from '../../src/pipeline/07-output.js';
import { categorize } from '../../src/pipeline/08-categorize.js';
import { mergeFixes } from '../../src/pipeline/08a-merge-fixes.js';
import { ensureDir, loadJson } from '../../src/lib/utils.js';
import { generatePipelineHtml } from './md-to-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, 'output');
const REPORT_PATH = join(OUTPUT_DIR, 'pipeline-status.html');

// Stage definitions with descriptions
const STAGES = [
  {
    id: '01-discover',
    name: 'Discover',
    fn: discover,
    description: 'Searches GitHub Code Search API for repositories containing `.claude-plugin/marketplace.json` files.',
    outputFile: './data/01-discovered.json',
    getMetrics: (data, prev) => ({
      'Total repos': { current: data?.total || 0, previous: prev?.total || 0 }
    })
  },
  {
    id: '02-fetch-repos',
    name: 'Fetch Repos',
    fn: fetchRepos,
    description: 'Fetches repository metadata (stars, forks, description, license) and owner information using GraphQL batch queries.',
    outputFile: './data/02-repos.json',
    getMetrics: (data, prev) => ({
      'Repos with metadata': { current: data?.total_repos || 0, previous: prev?.total_repos || 0 },
      'Unique owners': { current: data?.total_owners || 0, previous: prev?.total_owners || 0 }
    })
  },
  {
    id: '03-fetch-trees',
    name: 'Fetch Trees',
    fn: fetchTrees,
    description: 'Fetches the full file tree for each repository to identify plugin directories and files.',
    outputFile: './data/03-trees.json',
    getMetrics: (data, prev) => ({
      'Trees fetched': { current: data?.total || 0, previous: prev?.total || 0 }
    })
  },
  {
    id: '04-fetch-files',
    name: 'Fetch Files',
    fn: fetchFiles,
    description: 'Downloads marketplace.json, SKILL.md, and command/*.md files for each repository.',
    outputFile: './data/04-files.json',
    getMetrics: (data, prev) => {
      // Count files by type from the files array
      const countByType = (files) => {
        const counts = { marketplace: 0, command: 0, skill: 0, other: 0 };
        for (const f of (files || [])) {
          if (f.path?.includes('marketplace.json')) counts.marketplace++;
          else if (f.path?.includes('/commands/')) counts.command++;
          else if (f.path?.includes('SKILL.md')) counts.skill++;
          else counts.other++;
        }
        return counts;
      };
      const currentCounts = countByType(data?.files);
      const prevCounts = countByType(prev?.files);
      return {
        'Total files': { current: data?.total || 0, previous: prev?.total || 0 },
        'Marketplace files': { current: currentCounts.marketplace, previous: prevCounts.marketplace },
        'Command files': { current: currentCounts.command, previous: prevCounts.command },
        'Skill files': { current: currentCounts.skill, previous: prevCounts.skill }
      };
    }
  },
  {
    id: '05-parse',
    name: 'Parse',
    fn: parse,
    description: 'Parses JSON/YAML files, validates schemas, and extracts structured data from markdown files.',
    outputFile: './data/05-parsed.json',
    getMetrics: (data, prev) => ({
      'Marketplaces (valid)': { current: data?.validation?.marketplaces?.valid || 0, previous: prev?.validation?.marketplaces?.valid || 0 },
      'Marketplaces (invalid)': { current: data?.validation?.marketplaces?.invalid || 0, previous: prev?.validation?.marketplaces?.invalid || 0 },
      'Commands (valid)': { current: data?.validation?.commands?.valid || 0, previous: prev?.validation?.commands?.valid || 0 },
      'Skills (valid)': { current: data?.validation?.skills?.valid || 0, previous: prev?.validation?.skills?.valid || 0 },
      'Skills (invalid)': { current: data?.validation?.skills?.invalid || 0, previous: prev?.validation?.skills?.invalid || 0 }
    })
  },
  {
    id: '06-enrich',
    name: 'Enrich',
    fn: enrich,
    description: 'Builds author-centric data model, aggregates statistics, and generates install commands for each plugin.',
    outputFile: './data/06-enriched.json',
    getMetrics: (data, prev) => ({
      'Total authors': { current: data?.total_authors || 0, previous: prev?.total_authors || 0 }
    })
  },
  {
    id: '07-output',
    name: 'Output',
    fn: output,
    description: 'Generates web-ready JSON files for the frontend including index, browse endpoints, and per-author files.',
    outputFile: './web/public/data/index.json',
    getMetrics: (data, prev) => ({
      'Authors': { current: data?.meta?.total_authors || 0, previous: prev?.meta?.total_authors || 0 },
      'Marketplaces': { current: data?.meta?.total_marketplaces || 0, previous: prev?.meta?.total_marketplaces || 0 },
      'Plugins': { current: data?.meta?.total_plugins || 0, previous: prev?.meta?.total_plugins || 0 },
      'Commands': { current: data?.meta?.total_commands || 0, previous: prev?.meta?.total_commands || 0 },
      'Skills': { current: data?.meta?.total_skills || 0, previous: prev?.meta?.total_skills || 0 }
    })
  },
  {
    id: '08-categorize',
    name: 'Categorize',
    fn: categorize,
    description: 'Applies multi-tier categorization to marketplaces using verbs, nouns, and integrations.',
    outputFile: './data/marketplaces-categorized.json',
    getMetrics: (data, prev) => {
      // data is an array of categorized marketplaces
      const current = Array.isArray(data) ? data : [];
      const previous = Array.isArray(prev) ? prev : [];
      const withVerbs = current.filter(m => m.categories?.verbs?.length > 0).length;
      const withNouns = current.filter(m => m.categories?.nouns?.length > 0).length;
      const withIntegration = current.filter(m => m.categories?.integration).length;
      const prevWithVerbs = previous.filter(m => m.categories?.verbs?.length > 0).length;
      const prevWithNouns = previous.filter(m => m.categories?.nouns?.length > 0).length;
      const prevWithIntegration = previous.filter(m => m.categories?.integration).length;
      return {
        'Marketplaces': { current: current.length, previous: previous.length },
        'With verbs': { current: withVerbs, previous: prevWithVerbs },
        'With nouns': { current: withNouns, previous: prevWithNouns },
        'With integration': { current: withIntegration, previous: prevWithIntegration }
      };
    }
  },
  {
    id: '08a-merge-fixes',
    name: 'Merge Fixes',
    fn: mergeFixes,
    description: 'Applies manual corrections to AI-generated analysis data.',
    outputFile: './data/marketplace-detailed-analysis.json',
    getMetrics: () => ({
      // This stage modifies existing data, metrics would require tracking internal state
    })
  }
];

// State tracking
const state = {
  status: 'pending', // 'pending' | 'running' | 'completed' | 'failed'
  startTime: null,
  endTime: null,
  currentStage: null,
  stages: STAGES.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    status: 'pending', // 'pending' | 'running' | 'completed' | 'error'
    startTime: null,
    endTime: null,
    duration: null,
    error: null,
    metrics: null,
    previousData: null,
    validationErrors: null,  // Validation errors for 05-parse stage
    dataPreview: null        // First 5 items for data preview
  })),
  error: null
};

/**
 * Load previous data for comparison
 */
function snapshotPreviousData() {
  for (const stage of STAGES) {
    const stageState = state.stages.find(s => s.id === stage.id);
    try {
      if (existsSync(stage.outputFile)) {
        stageState.previousData = loadJson(stage.outputFile);
      }
    } catch {
      // File doesn't exist or is invalid, that's OK
    }
  }
}

/**
 * Format duration in seconds
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get data preview (first N items) for a stage
 */
function getDataPreview(stageId, data) {
  if (!data) return null;

  const PREVIEW_LIMIT = 5;

  switch (stageId) {
    case '01-discover':
      return data.repos?.slice(0, PREVIEW_LIMIT).map(r => ({
        full_name: r.full_name,
        marketplace_path: r.marketplace_path
      }));

    case '02-repos':
      return data.repos?.slice(0, PREVIEW_LIMIT).map(r => ({
        full_name: r.full_name,
        stars: r.repo?.signals?.stars,
        forks: r.repo?.signals?.forks
      }));

    case '03-trees':
      return data.trees?.slice(0, PREVIEW_LIMIT).map(t => ({
        full_name: t.full_name,
        file_count: t.tree?.length || 0,
        truncated: t.truncated
      }));

    case '04-files':
      return data.files?.slice(0, PREVIEW_LIMIT).map(f => ({
        full_name: f.full_name,
        path: f.path,
        size: f.size
      }));

    case '05-parse':
      return data.marketplaces?.slice(0, PREVIEW_LIMIT).map(m => ({
        full_name: m.full_name,
        name: m.data?.name,
        plugins: m.data?.plugins?.length || 0
      }));

    case '06-enrich': {
      const authors = Object.values(data.authors || {});
      return authors.slice(0, PREVIEW_LIMIT).map(a => ({
        id: a.id,
        marketplaces: a.stats?.total_marketplaces,
        plugins: a.stats?.total_plugins
      }));
    }

    case '07-output':
      return data.authors?.slice(0, PREVIEW_LIMIT).map(a => ({
        id: a.id,
        stars: a.stats?.total_stars
      }));

    case '08-categorize':
      if (Array.isArray(data)) {
        return data.slice(0, PREVIEW_LIMIT).map(m => ({
          name: m.name,
          verbs: m.categories?.verbs?.join(', '),
          nouns: m.categories?.nouns?.join(', ')
        }));
      }
      return null;

    default:
      return null;
  }
}

/**
 * Write report to disk
 */
function writeReport(autoRefresh = true) {
  const html = generatePipelineHtml(state, {
    title: 'ETL Pipeline Report',
    autoRefresh: autoRefresh && state.status === 'running',
    refreshInterval: 2
  });

  ensureDir(OUTPUT_DIR);
  writeFileSync(REPORT_PATH, html);
}

/**
 * Open report in browser
 */
function openInBrowser() {
  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    cmd = `open "${REPORT_PATH}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${REPORT_PATH}"`;
  } else {
    cmd = `xdg-open "${REPORT_PATH}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`Report saved to: ${REPORT_PATH}`);
      console.log('Open it in your browser to view.');
    }
  });
}

/**
 * Run the ETL pipeline with visualization
 */
async function runPipeline() {
  console.log('ETL Pipeline Visualizer');
  console.log('=======================\n');

  // Snapshot previous data for comparison
  console.log('Snapshotting previous data...');
  snapshotPreviousData();

  // Initialize state
  state.status = 'running';
  state.startTime = new Date();

  // Ensure data directory exists
  ensureDir('./data');

  // Write initial report and open browser
  writeReport();
  openInBrowser();

  // Run each stage
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const stageState = state.stages[i];

    console.log(`\n>>> Stage ${i + 1}/${STAGES.length}: ${stage.name}`);
    console.log('-'.repeat(40));

    stageState.status = 'running';
    stageState.startTime = new Date();
    state.currentStage = stage.id;
    writeReport();

    try {
      // Run the stage
      const result = await stage.fn();

      // Mark completed
      stageState.status = 'completed';
      stageState.endTime = new Date();
      stageState.duration = stageState.endTime - stageState.startTime;

      // Calculate metrics
      let currentData = result;

      // If stage doesn't return data, load from file
      if (!currentData && existsSync(stage.outputFile)) {
        try {
          currentData = loadJson(stage.outputFile);
        } catch {
          // Ignore
        }
      }

      if (stage.getMetrics) {
        stageState.metrics = stage.getMetrics(currentData, stageState.previousData);
      }

      // Capture validation errors for parse stage
      if (stage.id === '05-parse' && currentData?.validation?.errors) {
        stageState.validationErrors = currentData.validation.errors.slice(0, 20);
      }

      // Capture data preview (first 5 items)
      stageState.dataPreview = getDataPreview(stage.id, currentData);

      console.log(`Completed in ${formatDuration(stageState.duration)}`);
      writeReport();

    } catch (error) {
      stageState.status = 'error';
      stageState.endTime = new Date();
      stageState.duration = stageState.endTime - stageState.startTime;
      stageState.error = error.message;

      state.status = 'failed';
      state.error = `Stage "${stage.name}" failed: ${error.message}`;
      state.endTime = new Date();

      console.error(`ERROR: ${error.message}`);
      writeReport(false);

      process.exit(1);
    }
  }

  // All stages completed
  state.status = 'completed';
  state.endTime = new Date();
  state.currentStage = null;

  const totalDuration = state.endTime - state.startTime;
  console.log('\n' + '='.repeat(40));
  console.log(`Pipeline completed in ${formatDuration(totalDuration)}`);
  console.log('='.repeat(40));

  // Write final report (no auto-refresh)
  writeReport(false);

  console.log(`\nReport saved to: ${REPORT_PATH}`);
}

// Run if executed directly
runPipeline().catch(error => {
  console.error('Pipeline failed:', error);
  state.status = 'failed';
  state.error = error.message;
  state.endTime = new Date();
  writeReport(false);
  process.exit(1);
});
