import { existsSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { discover } from '../../src/pipeline/01-discover.js';
import { fetchFiles } from '../../src/pipeline/02-fetch-files.js';
import { parse } from '../../src/pipeline/03-parse.js';
import { fetchRepos } from '../../src/pipeline/04-fetch-repos.js';
import { enrich } from '../../src/pipeline/05-enrich.js';
import { snapshot } from '../../src/pipeline/06-snapshot.js';
import { aggregate } from '../../src/pipeline/07-aggregate.js';
import { output } from '../../src/pipeline/08-output.js';
import { ensureDir, loadJson, saveJson } from '../../src/lib/utils.js';
import { generatePipelineHtml } from './md-to-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, 'output');
const REPORT_PATH = join(OUTPUT_DIR, 'pipeline-status.html');
const LAST_RUN_PATH = './data/.last-run-metrics.json';

// Stage definitions with descriptions
const STAGES = [
  {
    id: '01-discover',
    name: 'Discover Repos',
    fn: discover,
    description: 'Searches GitHub Code Search API for repositories containing `.claude-plugin/marketplace.json` files.',
    outputFile: './data/01-discovered.json',
    getMetrics: (data, prev) => ({
      'Repos discovered': { current: data?.total || 0, previous: prev?.total || 0 }
    })
  },
  {
    id: '02-fetch-files',
    name: 'Fetch Files',
    fn: fetchFiles,
    description: 'Fetches .claude-plugin/ manifests and README files for parsing.',
    outputFile: './data/02-files.json',
    getMetrics: (data, prev) => {
      const files = data?.files || [];
      const prevFiles = prev?.files || [];

      // Count key file types we use
      const countByType = (fileList) => {
        const counts = { marketplace: 0, readme: 0 };
        for (const f of fileList) {
          if (f.path?.includes('marketplace.json')) counts.marketplace++;
          else if (f.path?.toLowerCase().includes('readme')) counts.readme++;
        }
        return counts;
      };

      const curr = countByType(files);
      const pre = countByType(prevFiles);

      return {
        'Total files': { current: data?.total || 0, previous: prev?.total || 0 },
        'Marketplace files': { current: curr.marketplace, previous: pre.marketplace },
        'README files': { current: curr.readme, previous: pre.readme }
      };
    }
  },
  {
    id: '03-parse',
    name: 'Validate Marketplace.json',
    fn: parse,
    description: 'Validates marketplace.json files and extracts plugins.',
    outputFile: './data/03-parsed.json',
    getMetrics: (data, prev) => {
      const marketplaces = data?.marketplaces || [];
      const prevMarketplaces = prev?.marketplaces || [];
      const totalPlugins = marketplaces.reduce((sum, m) => sum + (m.data?.plugins?.length || 0), 0);
      const prevTotalPlugins = prevMarketplaces.reduce((sum, m) => sum + (m.data?.plugins?.length || 0), 0);

      return {
        'Valid marketplaces': { current: data?.validation?.marketplaces?.valid || 0, previous: prev?.validation?.marketplaces?.valid || 0 },
        'Invalid': { current: data?.validation?.marketplaces?.invalid || 0, previous: prev?.validation?.marketplaces?.invalid || 0 },
        'Plugins extracted': { current: totalPlugins, previous: prevTotalPlugins }
      };
    }
  },
  {
    id: '04-fetch-repos',
    name: 'Fetch Repo Metadata',
    fn: fetchRepos,
    description: 'Fetches repository metadata (stars, forks, description) and owner information using GraphQL batch queries.',
    outputFile: './data/04-repos.json',
    getMetrics: (data, prev) => {
      const repos = data?.repos || [];
      const prevRepos = prev?.repos || [];

      // Count repos with description (for display quality)
      const withDescription = repos.filter(r => r.repo?.description).length;
      const prevWithDescription = prevRepos.filter(r => r.repo?.description).length;

      // Calculate total stars (for trending)
      const totalStars = repos.reduce((sum, r) => sum + (r.repo?.signals?.stars || 0), 0);
      const prevTotalStars = prevRepos.reduce((sum, r) => sum + (r.repo?.signals?.stars || 0), 0);

      // Calculate total forks (for trending)
      const totalForks = repos.reduce((sum, r) => sum + (r.repo?.signals?.forks || 0), 0);
      const prevTotalForks = prevRepos.reduce((sum, r) => sum + (r.repo?.signals?.forks || 0), 0);

      return {
        'Repos': { current: data?.total_repos || 0, previous: prev?.total_repos || 0 },
        'Unique owners': { current: data?.total_owners || 0, previous: prev?.total_owners || 0 },
        'With description': { current: withDescription, previous: prevWithDescription },
        'Total stars': { current: totalStars, previous: prevTotalStars },
        'Total forks': { current: totalForks, previous: prevTotalForks }
      };
    }
  },
  {
    id: '05-enrich',
    name: 'Merge Repo And Marketplace Data',
    fn: enrich,
    description: 'Merges repo metadata with marketplace data, groups by author.',
    outputFile: './data/05-enriched.json',
    getMetrics: (data, prev) => {
      const authors = Object.values(data?.authors || {});
      const prevAuthors = Object.values(prev?.authors || {});
      const sumStats = (list) => list.reduce((acc, a) => ({
        marketplaces: acc.marketplaces + (a.stats?.total_marketplaces || 0),
        plugins: acc.plugins + (a.stats?.total_plugins || 0)
      }), { marketplaces: 0, plugins: 0 });
      const curr = sumStats(authors);
      const pre = sumStats(prevAuthors);

      return {
        'Authors': { current: data?.total_authors || 0, previous: prev?.total_authors || 0 },
        'Marketplaces': { current: curr.marketplaces, previous: pre.marketplaces },
        'Plugins': { current: curr.plugins, previous: pre.plugins }
      };
    }
  },
  {
    id: '06-snapshot',
    name: 'Snapshot Stars And Forks',
    fn: snapshot,
    parallel: '06-07', // Run in parallel with aggregate
    description: 'Records star/fork counts for trending calculation.',
    outputFile: './data/signals-history.json',
    getMetrics: (data, prev) => {
      return {
        'Marketplaces': { current: data?.repo_count || 0, previous: prev?.repo_count || 0 },
        'With stars': { current: data?.with_stars || 0, previous: prev?.with_stars || 0 },
        'With forks': { current: data?.with_forks || 0, previous: prev?.with_forks || 0 }
      };
    }
  },
  {
    id: '07-aggregate',
    name: 'Aggregate Categories',
    fn: aggregate,
    parallel: '06-07', // Run in parallel with snapshot
    description: 'Aggregates plugin categories to marketplace level.',
    outputFile: './data/marketplaces-categorized.json',
    getMetrics: (data, prev) => {
      const current = Array.isArray(data) ? data : [];
      const previous = Array.isArray(prev) ? prev : [];
      const withCategories = current.filter(m => m.categories?.length > 0).length;
      const prevWithCategories = previous.filter(m => m.categories?.length > 0).length;

      return {
        'Marketplaces': { current: current.length, previous: previous.length },
        'With categories': { current: withCategories, previous: prevWithCategories }
      };
    }
  },
  {
    id: '08-output',
    name: 'Output',
    fn: output,
    description: 'Generates web-ready JSON files for the frontend.',
    outputFile: './web/public/data/marketplaces-browse.json',
    getMetrics: (data, prev) => ({
      'Authors': { current: data?.meta?.total_authors || 0, previous: prev?.meta?.total_authors || 0 },
      'Marketplaces': { current: data?.meta?.total_marketplaces || 0, previous: prev?.meta?.total_marketplaces || 0 },
      'Plugins': { current: data?.meta?.total_plugins || 0, previous: prev?.meta?.total_plugins || 0 }
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
    previousData: null,       // Previous data loaded from output file
    previousMetrics: null,    // Metrics from last completed run (for accurate comparison)
    validationErrors: null,   // Validation errors for 05-parse stage
    dataPreview: null,        // First 5 items for data preview
    progress: null            // Progress tracking { current, total }
  })),
  error: null
};

/**
 * Load previous run metrics for comparison
 * Uses a dedicated .last-run-metrics.json file to store metrics from the previous run
 */
function loadPreviousRunMetrics() {
  let lastRunMetrics = null;

  // First, try to load from the dedicated last-run file
  if (existsSync(LAST_RUN_PATH)) {
    try {
      lastRunMetrics = loadJson(LAST_RUN_PATH);
      console.log(`Loaded previous run metrics from ${new Date(lastRunMetrics.timestamp).toLocaleString()}`);
    } catch (err) {
      console.warn(`Warning: Could not load last run metrics: ${err.message}`);
    }
  }

  // Now load previous data from actual data files for comparison
  for (const stage of STAGES) {
    const stageState = state.stages.find(s => s.id === stage.id);
    try {
      if (existsSync(stage.outputFile)) {
        stageState.previousData = loadJson(stage.outputFile);
        console.log(`  Loaded previous data for ${stage.id}: ${stage.outputFile}`);
      } else {
        console.log(`  No previous data for ${stage.id}: ${stage.outputFile} (file not found)`);
      }
    } catch (err) {
      console.warn(`  Warning: Could not load previous data for ${stage.id}: ${err.message}`);
      stageState.previousData = null;
    }
  }

  // If we have saved metrics from last run, use those for comparison
  // This ensures we compare against the actual last completed run, not potentially stale files
  if (lastRunMetrics?.stages) {
    for (const savedStage of lastRunMetrics.stages) {
      const stageState = state.stages.find(s => s.id === savedStage.id);
      if (stageState && savedStage.metricsSnapshot) {
        stageState.previousMetrics = savedStage.metricsSnapshot;
      }
    }
  }
}

/**
 * Save current run metrics for future comparison
 */
function saveCurrentRunMetrics() {
  const metricsSnapshot = {
    timestamp: new Date().toISOString(),
    stages: state.stages.map(s => ({
      id: s.id,
      metricsSnapshot: s.metrics
    }))
  };

  try {
    saveJson(LAST_RUN_PATH, metricsSnapshot);
    console.log(`Saved run metrics to ${LAST_RUN_PATH}`);
  } catch (err) {
    console.warn(`Warning: Could not save run metrics: ${err.message}`);
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

    case '02-fetch-files':
      return data.files?.slice(0, PREVIEW_LIMIT).map(f => ({
        full_name: f.full_name,
        path: f.path,
        size: f.size
      }));

    case '03-parse':
      return data.marketplaces?.slice(0, PREVIEW_LIMIT).map(m => ({
        full_name: m.full_name,
        name: m.data?.name,
        plugins: m.data?.plugins?.length || 0
      }));

    case '04-fetch-repos':
      return data.repos?.slice(0, PREVIEW_LIMIT).map(r => ({
        full_name: r.full_name,
        stars: r.repo?.signals?.stars,
        forks: r.repo?.signals?.forks
      }));

    case '05-enrich': {
      const authors = Object.values(data.authors || {});
      return authors.slice(0, PREVIEW_LIMIT).map(a => ({
        id: a.id,
        marketplaces: a.stats?.total_marketplaces,
        plugins: a.stats?.total_plugins
      }));
    }

    case '06-snapshot':
      return {
        timestamp: data?.timestamp,
        marketplaces: data?.repo_count,
        with_stars: data?.with_stars,
        with_forks: data?.with_forks
      };

    case '07-aggregate':
      if (Array.isArray(data)) {
        return data.slice(0, PREVIEW_LIMIT).map(m => ({
          name: m.name,
          categories: m.categories?.join(', ') || 'none'
        }));
      }
      return null;

    case '08-output':
      return data.marketplaces?.slice(0, PREVIEW_LIMIT).map(m => ({
        name: m.name,
        author_id: m.author_id,
        stars: m.signals?.stars
      }));

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
 * Run a single stage and update its state
 */
async function runStage(stage, stageState, stageNum, totalStages) {
  console.log(`\n>>> Stage ${stageNum}/${totalStages}: ${stage.name}`);
  console.log('-'.repeat(40));

  stageState.status = 'running';
  stageState.startTime = new Date();
  state.currentStage = stage.id;
  writeReport();

  // Create progress callback
  const onProgress = (current, total) => {
    stageState.progress = { current, total };
    writeReport();
  };

  // Run the stage
  const result = await stage.fn({ onProgress });

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
    // Calculate metrics comparing current data to previous data
    const rawMetrics = stage.getMetrics(currentData, stageState.previousData);

    // If we have saved metrics from the last run, use those as "previous" values
    if (stageState.previousMetrics) {
      for (const [key, value] of Object.entries(rawMetrics)) {
        if (stageState.previousMetrics[key] !== undefined) {
          value.previous = stageState.previousMetrics[key].current;
        }
      }
    }

    stageState.metrics = rawMetrics;
  }

  // Capture validation errors for parse stage
  if (stage.id === '03-parse' && currentData?.validation?.errors) {
    stageState.validationErrors = currentData.validation.errors.slice(0, 20);
  }

  // Capture data preview (first 5 items)
  stageState.dataPreview = getDataPreview(stage.id, currentData);

  console.log(`Completed in ${formatDuration(stageState.duration)}`);
  writeReport();
}

/**
 * Run the ETL pipeline with visualization
 */
async function runPipeline() {
  console.log('ETL Pipeline Visualizer');
  console.log('=======================\n');

  // Load previous run metrics for comparison
  console.log('Loading previous run data for comparison...');
  loadPreviousRunMetrics();

  // Initialize state
  state.status = 'running';
  state.startTime = new Date();

  // Ensure data directory exists
  ensureDir('./data');

  // Write initial report and open browser
  writeReport();
  openInBrowser();

  // Run stages, handling parallel groups
  let i = 0;
  while (i < STAGES.length) {
    const stage = STAGES[i];
    const stageState = state.stages[i];

    try {
      // Check if this stage is part of a parallel group
      if (stage.parallel) {
        // Find all stages in the same parallel group
        const parallelStages = [];
        const parallelStates = [];
        let j = i;
        while (j < STAGES.length && STAGES[j].parallel === stage.parallel) {
          parallelStages.push(STAGES[j]);
          parallelStates.push(state.stages[j]);
          j++;
        }

        console.log(`\n>>> Stages ${i + 1}-${j}/${STAGES.length}: ${parallelStages.map(s => s.name).join(' + ')} (parallel)`);
        console.log('-'.repeat(40));

        // Run all parallel stages concurrently
        await Promise.all(parallelStages.map((s, idx) =>
          runStage(s, parallelStates[idx], i + idx + 1, STAGES.length)
            .catch(error => {
              parallelStates[idx].status = 'error';
              parallelStates[idx].endTime = new Date();
              parallelStates[idx].duration = parallelStates[idx].endTime - parallelStates[idx].startTime;
              parallelStates[idx].error = error.message;
              throw error;
            })
        ));

        i = j; // Skip to after the parallel group
      } else {
        // Run single stage
        await runStage(stage, stageState, i + 1, STAGES.length);
        i++;
      }
    } catch (error) {
      state.status = 'failed';
      state.error = `Stage failed: ${error.message}`;
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

  // Save metrics for future comparison
  saveCurrentRunMetrics();

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
