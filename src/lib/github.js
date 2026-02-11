import { Octokit } from 'octokit';
import { graphql } from '@octokit/graphql';
import { throttling } from '@octokit/plugin-throttling';
import Bottleneck from 'bottleneck';
import { config } from 'dotenv';
import { log, logError, sleep } from './utils.js';

config();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff
const MAX_RATE_LIMIT_RETRIES = 3; // Max times to wait for rate limit reset

// Batch sizes for GraphQL queries
const REPO_BATCH_SIZE = 15;
const FILE_BATCH_SIZE = 20;

// Rate limiting thresholds
const MIN_GRAPHQL_REMAINING = 100;
const MAX_RATE_LIMIT_WAIT_MS = 300000; // 5 minutes
const MAX_THROTTLE_RETRIES = 2;

/**
 * Sanitize a string for use in GraphQL queries
 * Escapes backslashes and double quotes to prevent injection
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeForGraphQL(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// Create throttled Octokit class
const ThrottledOctokit = Octokit.plugin(throttling);

// Lazy-initialized clients (prevents crashes during import in tests)
let _octokit = null;
let _graphqlWithAuth = null;
let _tokenValidated = false;

/**
 * Validate GitHub token and throw if missing
 * @throws {Error} If GITHUB_TOKEN is not set
 */
function validateToken() {
  if (_tokenValidated) return;

  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      `GITHUB_TOKEN environment variable is not set. Please set GITHUB_TOKEN in your .env file or environment. You can create a token at: https://github.com/settings/tokens`
    );
  }
  _tokenValidated = true;
}

/**
 * Get the Octokit instance (lazy initialization)
 * @returns {Octokit} Configured Octokit instance
 */
function getOctokit() {
  if (!_octokit) {
    validateToken();
    _octokit = new ThrottledOctokit({
      auth: process.env.GITHUB_TOKEN,
      request: {
        timeout: 30000 // 30 second timeout per request
      },
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          log(`Rate limit hit for ${options.method} ${options.url}`);
          if (retryCount < MAX_THROTTLE_RETRIES) {
            log(`Retrying after ${retryAfter} seconds`);
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (retryAfter, options, _octokit) => {
          log(`Secondary rate limit hit for ${options.method} ${options.url}`);
          log(`Retrying after ${retryAfter} seconds`);
          return true;
        },
      },
    });
  }
  return _octokit;
}

/**
 * Get the GraphQL client (lazy initialization)
 * @returns {Function} Configured GraphQL client
 */
function getGraphQL() {
  if (!_graphqlWithAuth) {
    validateToken();
    _graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
  }
  return _graphqlWithAuth;
}

// GraphQL rate limit tracking
let graphqlRateLimit = { remaining: 5000, resetAt: null };

// Code search limiter: 10 requests per minute (keep Bottleneck for search - very strict limit)
const searchLimiter = new Bottleneck({
  reservoir: 10,
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: 60 * 1000,
  minTime: 6000,
  maxConcurrent: 1
});

// REST API limiter for tree fetching (still needed as GraphQL doesn't support recursive trees)
const restLimiter = new Bottleneck({
  reservoir: 4500,
  reservoirRefreshAmount: 4500,
  reservoirRefreshInterval: 60 * 60 * 1000,
  minTime: 150,
  maxConcurrent: 5,
  highWater: 100,
  strategy: Bottleneck.strategy.OVERFLOW
});

// Log when reservoir is depleted
restLimiter.on('depleted', () => {
  log('WARNING: Rate limit reservoir depleted - requests will queue');
});

// Log when requests are dropped due to queue overflow
restLimiter.on('dropped', (_dropped) => {
  logError(`Request dropped due to queue overflow - queue limit reached`);
});

/**
 * Check GraphQL rate limit and wait if needed
 */
async function checkGraphQLRateLimit() {
  if (graphqlRateLimit.remaining < MIN_GRAPHQL_REMAINING && graphqlRateLimit.resetAt) {
    const waitMs = new Date(graphqlRateLimit.resetAt).getTime() - Date.now() + 1000;
    if (waitMs > 0 && waitMs < MAX_RATE_LIMIT_WAIT_MS) {
      log(`GraphQL rate limit low (${graphqlRateLimit.remaining}). Waiting ${Math.ceil(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
  }
}

/**
 * Execute GraphQL query with rate limit tracking
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} Query result
 */
async function executeGraphQL(query, variables = {}) {
  await checkGraphQLRateLimit();

  const result = await getGraphQL()(query, variables);

  // Update rate limit tracking if present
  if (result.rateLimit) {
    graphqlRateLimit = {
      remaining: result.rateLimit.remaining,
      resetAt: result.rateLimit.resetAt
    };
  }

  return result;
}

/**
 * Search code on GitHub
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @returns {Promise<Object>} Search results
 */
export async function searchCode(query, page = 1) {
  return searchLimiter.schedule(async () => {
    log(`Searching code: "${query}" (page ${page})`);
    const response = await getOctokit().rest.search.code({
      q: query,
      per_page: 100,
      page
    });
    return response.data;
  });
}

/**
 * Get repository metadata (legacy - use batchGetRepos for efficiency)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository data
 */
async function getRepo(owner, repo) {
  return restLimiter.schedule(async () => {
    log(`Fetching repo: ${owner}/${repo}`);
    const response = await getOctokit().rest.repos.get({ owner, repo });
    return response.data;
  });
}

/**
 * Get user/organization profile (legacy - use batchGetRepos for efficiency)
 * @param {string} username - GitHub username
 * @returns {Promise<Object>} User data
 */
async function getUser(username) {
  return restLimiter.schedule(async () => {
    log(`Fetching user: ${username}`);
    const response = await getOctokit().rest.users.getByUsername({ username });
    return response.data;
  });
}

/**
 * Batch fetch repository and owner metadata using GraphQL
 * @param {Array<{owner: string, repo: string}>} repos - Array of {owner, repo} objects
 * @returns {Promise<{repos: Object, owners: Object}>} Batched results
 */
export async function batchGetRepos(repos) {
  const results = { repos: {}, owners: {} };

  // Process in batches
  for (let i = 0; i < repos.length; i += REPO_BATCH_SIZE) {
    const batch = repos.slice(i, i + REPO_BATCH_SIZE);
    log(`Batch fetching repos ${i + 1}-${Math.min(i + REPO_BATCH_SIZE, repos.length)} of ${repos.length}`);

    // Build dynamic query with aliases (sanitize inputs to prevent GraphQL injection)
    const repoQueries = batch.map((r, idx) => `
      repo${idx}: repository(owner: "${sanitizeForGraphQL(r.owner)}", name: "${sanitizeForGraphQL(r.repo)}") {
        name
        description
        url
        homepageUrl
        stargazerCount
        forkCount
        pushedAt
        createdAt
        isArchived
        isFork
        primaryLanguage { name }
        licenseInfo { spdxId name }
        defaultBranchRef { name target { oid } }
        owner {
          login
          avatarUrl
          url
          ... on User {
            name
            bio
            company
            followers { totalCount }
          }
          ... on Organization {
            name
            description
            membersWithRole { totalCount }
          }
        }
      }
    `).join('\n');

    const query = `
      query batchRepos {
        rateLimit { remaining resetAt }
        ${repoQueries}
      }
    `;

    try {
      const response = await executeGraphQL(query);

      // Process each repo in the batch
      batch.forEach((r, idx) => {
        const repoData = response[`repo${idx}`];
        if (repoData) {
          const fullName = `${r.owner}/${r.repo}`;

          // Store repo data
          results.repos[fullName] = {
            full_name: fullName,
            name: repoData.name,
            description: repoData.description,
            html_url: repoData.url,
            homepage: repoData.homepageUrl,
            stargazers_count: repoData.stargazerCount,
            forks_count: repoData.forkCount,
            pushed_at: repoData.pushedAt,
            created_at: repoData.createdAt,
            archived: repoData.isArchived,
            fork: repoData.isFork,
            language: repoData.primaryLanguage?.name ?? null,
            license: repoData.licenseInfo ? { spdx_id: repoData.licenseInfo.spdxId, name: repoData.licenseInfo.name } : null,
            default_branch: repoData.defaultBranchRef?.name ?? 'main',
            default_branch_sha: repoData.defaultBranchRef?.target?.oid ?? null,
            owner: { login: repoData.owner.login }
          };

          // Store owner data (deduplicated)
          if (!results.owners[repoData.owner.login]) {
            const owner = repoData.owner;
            results.owners[owner.login] = {
              login: owner.login,
              avatar_url: owner.avatarUrl,
              html_url: owner.url,
              name: owner.name ?? owner.login,
              bio: owner.bio ?? owner.description ?? null,
              company: owner.company ?? null,
              type: owner.membersWithRole ? 'Organization' : 'User',
              followers: owner.followers?.totalCount ?? owner.membersWithRole?.totalCount ?? 0
            };
          }
        }
      });
    } catch (error) {
      logError(`GraphQL batch error for repos ${i + 1}-${i + batch.length}`, error);
      // Fall back to individual REST calls for this batch
      for (const r of batch) {
        try {
          const repoData = await getRepo(r.owner, r.repo);
          const fullName = `${r.owner}/${r.repo}`;
          results.repos[fullName] = repoData;

          if (!results.owners[r.owner]) {
            const userData = await getUser(r.owner);
            results.owners[r.owner] = userData;
          }
        } catch (err) {
          logError(`Fallback REST error for ${r.owner}/${r.repo}`, err);
        }
      }
    }
  }

  return results;
}

/**
 * Get repository tree (full file structure) - uses REST as GraphQL doesn't support recursive trees
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} sha - Tree SHA or branch name
 * @returns {Promise<Object>} Tree data
 */
export async function getTree(owner, repo, sha) {
  return restLimiter.schedule(async () => {
    log(`Fetching tree: ${owner}/${repo}@${sha}`);
    const response = await getOctokit().rest.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: 'true'
    });
    return response.data;
  });
}

/**
 * Get file contents (legacy - use batchGetFiles for efficiency)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @returns {Promise<Object>} File content data
 */
export async function getFileContent(owner, repo, path) {
  return restLimiter.schedule(async () => {
    log(`Fetching file: ${owner}/${repo}/${path}`);
    const response = await getOctokit().rest.repos.getContent({
      owner,
      repo,
      path
    });
    return response.data;
  });
}

/**
 * Check if a file exists in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @returns {Promise<boolean>} True if file exists
 */
export async function checkFileExists(owner, repo, path) {
  return restLimiter.schedule(async () => {
    try {
      await getOctokit().request('HEAD /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  });
}

/**
 * Batch fetch file contents using GraphQL
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (e.g., 'main', 'master')
 * @param {Array<string>} paths - Array of file paths
 * @returns {Promise<Object>} Map of path -> content
 */
export async function batchGetFiles(owner, repo, branch, paths) {
  const results = {};

  // Process in batches
  for (let i = 0; i < paths.length; i += FILE_BATCH_SIZE) {
    const batch = paths.slice(i, i + FILE_BATCH_SIZE);
    log(`Batch fetching files ${i + 1}-${Math.min(i + FILE_BATCH_SIZE, paths.length)} of ${paths.length} from ${owner}/${repo}`);

    // Build dynamic query with aliases (sanitize inputs to prevent GraphQL injection)
    const safeBranch = sanitizeForGraphQL(branch);
    const fileQueries = batch.map((path, idx) => `
      file${idx}: object(expression: "${safeBranch}:${sanitizeForGraphQL(path)}") {
        ... on Blob {
          text
          byteSize
          isBinary
        }
      }
    `).join('\n');

    const query = `
      query batchFiles($owner: String!, $repo: String!) {
        rateLimit { remaining resetAt }
        repository(owner: $owner, name: $repo) {
          ${fileQueries}
        }
      }
    `;

    try {
      const response = await executeGraphQL(query, { owner, repo });

      // Process each file in the batch
      batch.forEach((path, idx) => {
        const fileData = response.repository?.[`file${idx}`];
        if (fileData && fileData.text !== undefined) {
          results[path] = {
            content: fileData.text,
            size: fileData.byteSize,
            encoding: 'utf-8',
            path: path
          };
        } else if (fileData?.isBinary) {
          log(`Skipping binary file: ${path}`);
        }
      });
    } catch (error) {
      logError(`GraphQL batch files error for ${owner}/${repo}`, error);
      // Fall back to individual REST calls for this batch
      for (const path of batch) {
        try {
          const fileData = await getFileContent(owner, repo, path);
          if (fileData.content) {
            results[path] = {
              content: Buffer.from(fileData.content, 'base64').toString('utf-8'),
              size: fileData.size,
              encoding: fileData.encoding,
              path: path
            };
          }
        } catch (err) {
          // File might not exist - this is OK
          if (err.status !== 404) {
            logError(`Fallback REST error for ${owner}/${repo}/${path}`, err);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Batch verify whether a file exists across multiple repos using GraphQL
 * Uses object() queries to check for a file at HEAD in batches of 20.
 * @param {Array<{owner: string, repo: string, full_name: string}>} repos - Repos to check
 * @param {string} filePath - File path to check (e.g., '.claude-plugin/marketplace.json')
 * @returns {Promise<Map<string, boolean>>} Map of full_name -> exists
 */
export async function batchVerifyFileExists(repos, filePath) {
  const results = new Map();
  const safePath = sanitizeForGraphQL(filePath);

  // Filter out repos with missing required fields
  const validRepos = repos.filter(r => r.owner && r.repo && r.full_name);
  if (validRepos.length < repos.length) {
    log(`WARNING: Skipped ${repos.length - validRepos.length} repos with missing owner/repo/full_name`);
  }

  for (let i = 0; i < validRepos.length; i += FILE_BATCH_SIZE) {
    const batch = validRepos.slice(i, i + FILE_BATCH_SIZE);
    log(`Verifying repos ${i + 1}-${Math.min(i + FILE_BATCH_SIZE, validRepos.length)} of ${validRepos.length}`);

    const repoQueries = batch.map((r, idx) => `
      repo${idx}: repository(owner: "${sanitizeForGraphQL(r.owner)}", name: "${sanitizeForGraphQL(r.repo)}") {
        object(expression: "HEAD:${safePath}") {
          ... on Blob { byteSize }
        }
      }
    `).join('\n');

    const query = `
      query batchVerify {
        rateLimit { remaining resetAt }
        ${repoQueries}
      }
    `;

    try {
      const response = await executeGraphQL(query);

      batch.forEach((r, idx) => {
        const repoData = response[`repo${idx}`];
        // null repo = deleted/private/renamed, null object = file removed
        const exists = repoData?.object !== null && repoData?.object !== undefined;
        results.set(r.full_name, exists);
      });
    } catch (error) {
      logError(`GraphQL batch verify error for repos ${i + 1}-${i + batch.length}`, error);

      // Extract partial data from GraphQL errors (e.g., one deleted repo causes
      // an error, but data for the other repos is still available on error.data)
      const partialData = error.data || {};

      for (const [idx, r] of batch.entries()) {
        const repoData = partialData[`repo${idx}`];
        if (repoData !== undefined) {
          const exists = repoData?.object !== null && repoData?.object !== undefined;
          results.set(r.full_name, exists);
        } else {
          // No data — fall back to individual REST check
          try {
            const exists = await checkFileExists(r.owner, r.repo, filePath);
            results.set(r.full_name, exists);
          } catch {
            // REST also failed — conservatively assume still exists
            results.set(r.full_name, true);
          }
        }
      }
    }
  }

  return results;
}


/**
 * Wrapper for API calls with error handling and retry logic
 * @param {Function} fn - API function to call
 * @param {string} context - Context for error messages
 * @param {*} defaultValue - Default value on error
 * @returns {Promise<*>} API result or default value
 */
export async function safeApiCall(fn, context, defaultValue = null) {
  let rateLimitRetries = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // 404 is permanent - don't retry
      if (error.status === 404) {
        log(`Not found: ${context}`);
        return defaultValue;
      }

      // Rate limited - check for reset time
      if (error.status === 403) {
        const resetTime = error.response?.headers?.['x-ratelimit-reset'];
        const remaining = error.response?.headers?.['x-ratelimit-remaining'];

        if (resetTime && remaining === '0' && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
          const waitMs = (parseInt(resetTime, 10) * 1000) - Date.now() + 1000;
          if (waitMs > 0 && waitMs < MAX_RATE_LIMIT_WAIT_MS) {
            rateLimitRetries++;
            log(`Rate limited (${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES}). Waiting ${Math.ceil(waitMs / 1000)}s for reset: ${context}`);
            await sleep(waitMs);
            continue; // Retry after waiting
          }
        }

        logError(`Rate limited or forbidden (after ${rateLimitRetries} rate limit retries): ${context}`, error);
        return defaultValue;
      }

      // Server errors (5xx) or network errors - retry with backoff
      if (attempt < MAX_RETRIES && (error.status >= 500 || !error.status)) {
        const delay = RETRY_DELAYS[attempt];
        log(`Retry ${attempt + 1}/${MAX_RETRIES} for ${context} after ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // Other errors or max retries reached
      logError(`API error: ${context}`, error);
      return defaultValue;
    }
  }
  return defaultValue;
}

