/**
 * Generate styled HTML document for ETL pipeline visualization
 * @param {object} state - The pipeline state object
 * @param {object} options - Options for the conversion
 * @returns {string} Complete HTML document
 */
export function generatePipelineHtml(state, options = {}) {
  const {
    title = 'ETL Pipeline Report',
    autoRefresh = false,
    refreshInterval = 2
  } = options;

  const refreshMeta = autoRefresh
    ? `<meta http-equiv="refresh" content="${refreshInterval}">`
    : '';

  const now = new Date();
  const elapsed = state.startTime ? now - state.startTime : 0;
  const completedStages = state.stages.filter(s => s.status === 'completed').length;
  const totalStages = state.stages.length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  // Generate stage nodes HTML
  const stageNodesHtml = state.stages.map((stage, index) => {
    const statusClass = `status-${stage.status}`;
    const statusIcon = getStatusIcon(stage.status);
    const duration = stage.duration ? formatDuration(stage.duration) : '';

    // Build metrics HTML as table
    let metricsHtml = '';
    if (stage.metrics && stage.status === 'completed') {
      const metricRows = Object.entries(stage.metrics).map(([key, val]) => {
        const change = val.current - val.previous;
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeText = change === 0 ? '=' : (change > 0 ? `+${change}` : `${change}`);
        return `<tr>
          <td class="metric-label">${key}</td>
          <td class="metric-value">${val.previous}</td>
          <td class="metric-value">${val.current}</td>
          <td class="metric-change ${changeClass}">${changeText}</td>
        </tr>`;
      }).join('');
      metricsHtml = `<div class="metrics">
        <table class="metrics-table">
          <thead><tr><th></th><th>Before</th><th>After</th><th></th></tr></thead>
          <tbody>${metricRows}</tbody>
        </table>
      </div>`;
    }

    // Build validation errors HTML (for 05-parse stage)
    let validationErrorsHtml = '';
    if (stage.validationErrors && stage.validationErrors.length > 0) {
      const errorItems = stage.validationErrors.map(err =>
        `<li><strong>${escapeHtml(err.context)}</strong>: ${escapeHtml(err.errors?.join(', ') || 'Unknown error')}</li>`
      ).join('');
      validationErrorsHtml = `
        <details class="validation-errors">
          <summary>${stage.validationErrors.length} validation errors</summary>
          <ul class="error-list">${errorItems}</ul>
        </details>
      `;
    }

    // Build data preview HTML
    let dataPreviewHtml = '';
    if (stage.dataPreview && stage.dataPreview.length > 0 && stage.status === 'completed') {
      const previewJson = JSON.stringify(stage.dataPreview, null, 2);
      dataPreviewHtml = `
        <details class="data-preview">
          <summary>Preview data (first ${stage.dataPreview.length} items)</summary>
          <pre><code>${escapeHtml(previewJson)}</code></pre>
        </details>
      `;
    }

    const connector = index < state.stages.length - 1 ? '<div class="connector"><div class="connector-line"></div><div class="connector-arrow"></div></div>' : '';

    return `
      <div class="stage-wrapper">
        <div class="stage-node ${statusClass}">
          <div class="stage-header">
            <div class="stage-icon">${statusIcon}</div>
            <div class="stage-number">${String(index + 1).padStart(2, '0')}</div>
          </div>
          <div class="stage-name">${stage.name}</div>
          <div class="stage-status">${formatStatus(stage.status)}${duration ? ` · ${duration}` : ''}</div>
          ${metricsHtml}
          ${stage.error ? `<div class="stage-error">${escapeHtml(stage.error)}</div>` : ''}
          ${validationErrorsHtml}
          ${dataPreviewHtml}
        </div>
        ${connector}
      </div>
    `;
  }).join('');

  // Final stats for completed pipeline
  let finalStatsHtml = '';
  if (state.status === 'completed') {
    const outputStage = state.stages.find(s => s.id === '07-output');
    if (outputStage?.metrics) {
      const statsItems = Object.entries(outputStage.metrics).map(([key, val]) =>
        `<div class="final-stat">
          <div class="final-stat-value">${val.current}</div>
          <div class="final-stat-label">${key}</div>
        </div>`
      ).join('');
      finalStatsHtml = `
        <div class="final-stats">
          <h3>Final Output</h3>
          <div class="final-stats-grid">${statsItems}</div>
        </div>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${refreshMeta}
  <title>${title}</title>
  <style>
    :root {
      --bg-color: #0f0f1a;
      --bg-secondary: #1a1a2e;
      --bg-tertiary: #252540;
      --text-color: #e4e4f0;
      --text-muted: #8888a0;
      --border-color: #3a3a5c;
      --accent-color: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.3);
      --success-color: #22c55e;
      --success-glow: rgba(34, 197, 94, 0.3);
      --warning-color: #f59e0b;
      --warning-glow: rgba(245, 158, 11, 0.3);
      --error-color: #ef4444;
      --error-glow: rgba(239, 68, 68, 0.3);
      --pending-color: #64748b;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg-color: #f8fafc;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f1f5f9;
        --text-color: #1e293b;
        --text-muted: #64748b;
        --border-color: #e2e8f0;
        --accent-glow: rgba(99, 102, 241, 0.15);
        --success-glow: rgba(34, 197, 94, 0.15);
        --warning-glow: rgba(245, 158, 11, 0.15);
        --error-glow: rgba(239, 68, 68, 0.15);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .header h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--accent-color);
    }

    .header-meta {
      display: flex;
      justify-content: center;
      gap: 2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .header-meta span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Overall status badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-weight: 500;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .status-badge.running {
      background: var(--warning-glow);
      color: var(--warning-color);
      border: 1px solid var(--warning-color);
    }

    .status-badge.completed {
      background: var(--success-glow);
      color: var(--success-color);
      border: 1px solid var(--success-color);
    }

    .status-badge.failed {
      background: var(--error-glow);
      color: var(--error-color);
      border: 1px solid var(--error-color);
    }

    .status-badge.pending {
      background: var(--bg-tertiary);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
    }

    /* Progress bar */
    .progress-container {
      margin: 2rem auto;
      max-width: 600px;
    }

    .progress-bar {
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent-color);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-text {
      text-align: center;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    /* Pipeline container */
    .pipeline {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      gap: 0;
      padding: 2rem 0;
      overflow-x: auto;
      margin: 2rem 0;
    }

    .stage-wrapper {
      display: flex;
      align-items: flex-start;
    }

    /* Stage nodes */
    .stage-node {
      position: relative;
      width: 160px;
      min-height: 140px;
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.3s ease;
    }

    .stage-node.status-completed {
      border-color: var(--success-color);
    }

    .stage-node.status-running {
      border-color: var(--warning-color);
      animation: pulse 2s infinite;
    }

    .stage-node.status-error {
      border-color: var(--error-color);
    }

    .stage-node.status-pending {
      opacity: 0.6;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .stage-icon {
      font-size: 1.25rem;
    }

    .stage-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .stage-name {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage-status {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    .stage-error {
      font-size: 0.7rem;
      color: var(--error-color);
      background: var(--error-glow);
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
      word-break: break-word;
    }

    /* Metrics */
    .metrics {
      border-top: 1px solid var(--border-color);
      padding-top: 0.75rem;
      margin-top: 0.5rem;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      padding: 0.2rem 0;
    }

    .metric-label {
      color: var(--text-muted);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metric-value {
      font-weight: 600;
      margin: 0 0.5rem;
    }

    .metric-change {
      font-size: 0.65rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-weight: 500;
    }

    .metric-change.positive {
      background: var(--success-glow);
      color: var(--success-color);
    }

    .metric-change.negative {
      background: var(--error-glow);
      color: var(--error-color);
    }

    .metric-change.neutral {
      background: var(--bg-tertiary);
      color: var(--text-muted);
    }

    /* Validation errors and data preview */
    .validation-errors,
    .data-preview {
      margin-top: 0.75rem;
      font-size: 0.7rem;
    }

    .validation-errors summary,
    .data-preview summary {
      cursor: pointer;
      color: var(--text-muted);
      padding: 0.25rem 0;
    }

    .validation-errors summary {
      color: var(--error-color);
    }

    .validation-errors summary:hover,
    .data-preview summary:hover {
      color: var(--text-color);
    }

    .error-list {
      list-style: none;
      padding: 0.5rem;
      margin: 0.25rem 0 0 0;
      background: var(--error-glow);
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .error-list li {
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--border-color);
      word-break: break-word;
    }

    .error-list li:last-child {
      border-bottom: none;
    }

    .data-preview pre {
      background: var(--bg-tertiary);
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.25rem 0 0 0;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;
    }

    .data-preview code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.65rem;
      line-height: 1.4;
    }

    /* Connectors */
    .connector {
      display: flex;
      align-items: center;
      width: 40px;
      height: 140px;
      padding-top: 50px;
    }

    .connector-line {
      flex: 1;
      height: 2px;
      background: var(--border-color);
    }

    .connector-arrow {
      width: 0;
      height: 0;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-left: 8px solid var(--border-color);
    }

    .status-completed + .connector .connector-line,
    .status-completed + .connector .connector-arrow {
      border-left-color: var(--success-color);
      background: var(--success-color);
    }

    /* Final stats */
    .final-stats {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 2rem;
      text-align: center;
    }

    .final-stats h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-muted);
    }

    .final-stats-grid {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .final-stat {
      text-align: center;
    }

    .final-stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent-color);
    }

    .final-stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .pipeline {
        justify-content: flex-start;
        padding-left: 1rem;
      }
    }

    @media (max-width: 768px) {
      .stage-node {
        width: 140px;
        min-height: 120px;
      }

      .connector {
        width: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ETL Pipeline</h1>
      <div class="header-meta">
        <span>Started: ${state.startTime ? state.startTime.toLocaleTimeString() : 'N/A'}</span>
        <span>Elapsed: ${formatDuration(elapsed)}</span>
      </div>
      <div class="status-badge ${state.status}">
        ${getStatusIcon(state.status)} ${formatStatus(state.status)}
        ${state.status === 'failed' && state.error ? ` - ${state.error}` : ''}
      </div>
    </div>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      <div class="progress-text">${completedStages} of ${totalStages} stages complete</div>
    </div>

    <div class="pipeline">
      ${stageNodesHtml}
    </div>

    ${finalStatsHtml}

    <div class="footer">
      Generated by ETL Pipeline Visualizer · ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'completed': return '\u2713';
    case 'running': return '\u25cb';
    case 'pending': return '\u2022';
    case 'error':
    case 'failed': return '\u2717';
    default: return '\u2022';
  }
}

/**
 * Format status text
 */
function formatStatus(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'running': return 'Running';
    case 'pending': return 'Pending';
    case 'error':
    case 'failed': return 'Failed';
    default: return status;
  }
}

/**
 * Format duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
