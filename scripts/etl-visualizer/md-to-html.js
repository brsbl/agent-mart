/**
 * Generate styled HTML document for ETL pipeline visualization
 * Redesigned to match the reference React component design
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
  const isRunning = state.status === 'running';

  // Generate stage nodes HTML with vertical layout
  const stageNodesHtml = state.stages.map((stage, index) => {
    const statusClass = `status-${stage.status}`;
    const statusIcon = getStatusIconHtml(stage.status);
    const duration = stage.duration ? formatDuration(stage.duration) : '';

    // Build metrics HTML as table
    let metricsHtml = '';
    if (stage.metrics && Object.keys(stage.metrics).length > 0 && stage.status === 'completed') {
      const metricRows = Object.entries(stage.metrics).map(([key, val]) => {
        const change = val.current - val.previous;
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeIcon = change > 0 ? '&#9650;' : change < 0 ? '&#9660;' : '';
        const changeText = change === 0 ? '&mdash;' : (change > 0 ? `+${change}` : `${change}`);
        return `<tr>
          <td class="metric-label">${escapeHtml(key)}</td>
          <td class="metric-value metric-before">${val.previous.toLocaleString()}</td>
          <td class="metric-arrow">&rarr;</td>
          <td class="metric-value metric-after">${val.current.toLocaleString()}</td>
          <td class="metric-change ${changeClass}">
            <span class="change-badge">${changeIcon} ${changeText}</span>
          </td>
        </tr>`;
      }).join('');
      metricsHtml = `
        <div class="metrics">
          <table class="metrics-table">
            <thead>
              <tr>
                <th class="th-metric">Metric</th>
                <th class="th-before">Before</th>
                <th class="th-arrow"></th>
                <th class="th-after">After</th>
                <th class="th-change">Change</th>
              </tr>
            </thead>
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

    // Status text
    let statusText = '';
    if (stage.status === 'completed' && duration) {
      statusText = `<span class="stage-duration">${duration}</span>`;
    } else if (stage.status === 'running') {
      const progressText = stage.progress
        ? `${stage.progress.current}/${stage.progress.total}`
        : 'Running';
      statusText = `<span class="stage-running"><span class="running-dot"></span>${progressText}</span>`;
    } else if (stage.status === 'pending') {
      statusText = `<span class="stage-pending">Pending</span>`;
    } else if (stage.status === 'error') {
      statusText = `<span class="stage-error-text">Failed</span>`;
    }

    // Connector between stages
    const isCompleted = stage.status === 'completed';
    const nextStage = state.stages[index + 1];
    const nextIsRunning = nextStage?.status === 'running';
    const connectorHtml = index < state.stages.length - 1
      ? `<div class="connector ${isCompleted ? 'active' : ''} ${isCompleted && nextIsRunning ? 'animated' : ''}">
           <div class="connector-line"></div>
           ${isCompleted && nextIsRunning ? '<div class="connector-flow"></div>' : ''}
         </div>`
      : '';

    return `
      <div class="stage-card ${statusClass}">
        <div class="stage-header">
          <div class="status-icon-wrapper ${statusClass}">
            ${statusIcon}
          </div>
          <div class="stage-info">
            <div class="stage-title-row">
              <span class="stage-number">${String(index + 1).padStart(2, '0')}</span>
              <span class="stage-name">${escapeHtml(stage.name)}</span>
            </div>
            ${stage.description ? `<div class="stage-description">${escapeHtml(stage.description)}</div>` : ''}
            ${statusText}
          </div>
        </div>
        ${metricsHtml}
        ${stage.error ? `<div class="stage-error">${escapeHtml(stage.error)}</div>` : ''}
        ${validationErrorsHtml}
        ${dataPreviewHtml}
      </div>
      ${connectorHtml}
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${refreshMeta}
  <title>${title}</title>
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #171717;
      --text-muted: #525252;
      --text-light: #a3a3a3;
      --border-color: #e5e5e5;
      --border-dark: #262626;
      --success-color: #059669;
      --success-bg: #ecfdf5;
      --success-text: #047857;
      --error-color: #dc2626;
      --error-bg: #fef2f2;
      --error-text: #b91c1c;
      --amber-color: #d97706;
      --neutral-300: #d4d4d4;
      --neutral-400: #a3a3a3;
      --neutral-500: #737373;
      --neutral-600: #525252;
      --neutral-700: #404040;
      --neutral-800: #262626;
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
      padding: 3rem 2rem;
    }

    .container {
      max-width: 56rem;
      margin: 0 auto;
    }

    /* ASCII Header */
    .ascii-header {
      text-align: center;
      margin-bottom: 3rem;
      user-select: none;
    }

    .ascii-header pre {
      font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.65rem;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text-color);
      display: inline-block;
      text-align: left;
    }

    .gradient-dots {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      margin-top: 1rem;
    }

    .gradient-dots .dot {
      width: 0.5rem;
      height: 0.5rem;
    }

    .gradient-dots .line {
      width: 2rem;
      height: 2px;
      background: var(--neutral-300);
      margin: 0 0.5rem;
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .stages-count {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .time-info {
      display: flex;
      gap: 1.5rem;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .time-info .label {
      color: var(--text-light);
    }

    /* Progress Bar */
    .progress-container {
      margin-bottom: 2rem;
    }

    .progress-bar {
      position: relative;
      width: 100%;
      height: 4px;
      background: var(--border-color);
      overflow: hidden;
    }

    .progress-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: var(--text-color);
      transition: width 0.5s ease-out;
    }

    .progress-shimmer {
      position: absolute;
      top: 0;
      height: 100%;
      width: 25%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { left: -25%; }
      100% { left: 100%; }
    }

    /* Pipeline Stages */
    .pipeline {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    /* Stage Cards */
    .stage-card {
      border: 2px solid var(--border-color);
      background: var(--bg-color);
      transition: all 0.3s ease;
      padding: 1.5rem;
    }

    .stage-card.status-completed {
      border-color: var(--neutral-800);
      border-style: solid;
    }

    .stage-card.status-running {
      border-color: var(--text-color);
      border-style: solid;
    }

    .stage-card.status-pending {
      border-color: var(--border-color);
      border-style: dashed;
    }

    .stage-card.status-error {
      border-color: var(--error-color);
      border-style: solid;
    }

    .stage-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    /* Status Icon */
    .status-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      flex-shrink: 0;
      transition: background-color 0.3s ease;
    }

    .status-icon-wrapper.status-completed {
      background: var(--success-color);
    }

    .status-icon-wrapper.status-running {
      background: var(--text-color);
    }

    .status-icon-wrapper.status-pending {
      background: var(--neutral-300);
    }

    .status-icon-wrapper.status-error {
      background: var(--error-color);
    }

    .status-icon-wrapper svg {
      width: 1rem;
      height: 1rem;
    }

    .status-icon-wrapper.status-completed svg,
    .status-icon-wrapper.status-running svg,
    .status-icon-wrapper.status-error svg {
      color: white;
      stroke: white;
    }

    .status-icon-wrapper.status-pending svg {
      color: var(--neutral-300);
      fill: var(--neutral-300);
    }

    /* Running dots animation */
    .running-dots {
      display: flex;
      gap: 2px;
      align-items: center;
      justify-content: center;
    }

    .running-dots .dot {
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
    }

    .running-dots .dot:nth-child(1) { animation: spin-dot 0.8s ease-in-out infinite 0s; }
    .running-dots .dot:nth-child(2) { animation: spin-dot 0.8s ease-in-out infinite 0.2s; }
    .running-dots .dot:nth-child(3) { animation: spin-dot 0.8s ease-in-out infinite 0.4s; }

    @keyframes spin-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
    }

    /* Stage Info */
    .stage-info {
      flex: 1;
    }

    .stage-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stage-number {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .stage-card.status-pending .stage-number {
      color: var(--text-light);
    }

    .stage-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-color);
    }

    .stage-card.status-pending .stage-name {
      color: var(--text-light);
    }

    .stage-duration {
      display: block;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--amber-color);
      margin-top: 0.25rem;
    }

    .stage-running {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-color);
      margin-top: 0.25rem;
    }

    .running-dot {
      display: inline-block;
      width: 4px;
      height: 4px;
      background: var(--text-color);
      border-radius: 50%;
      animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .stage-pending {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      color: var(--text-light);
      margin-top: 0.25rem;
    }

    .stage-description {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      line-height: 1.4;
    }

    .stage-card.status-pending .stage-description {
      color: var(--text-light);
    }

    .stage-error-text {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--error-color);
      margin-top: 0.25rem;
    }

    /* Metrics Table */
    .metrics {
      margin-top: 1rem;
    }

    .metrics-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.75rem;
    }

    .metrics-table thead tr {
      border-bottom: 1px solid var(--border-color);
    }

    .metrics-table th {
      text-align: left;
      padding-bottom: 0.5rem;
      font-weight: 400;
      color: var(--text-muted);
    }

    .metrics-table .th-before,
    .metrics-table .th-after,
    .metrics-table .th-change {
      text-align: right;
    }

    .metrics-table .th-arrow {
      width: 2rem;
      text-align: center;
    }

    .metrics-table tbody tr {
      border-bottom: 1px solid #f5f5f5;
    }

    .metrics-table tbody tr:last-child {
      border-bottom: none;
    }

    .metrics-table td {
      padding: 0.5rem 0;
    }

    .metric-label {
      color: var(--text-muted);
    }

    .metric-value {
      text-align: right;
      color: var(--text-muted);
    }

    .metric-after {
      font-weight: 600;
      color: var(--text-color);
    }

    .metric-arrow {
      text-align: center;
      color: var(--text-light);
      padding: 0.5rem 0.25rem;
    }

    .metric-change {
      text-align: right;
    }

    .change-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      font-weight: 600;
    }

    .metric-change.positive .change-badge {
      background: var(--success-bg);
      color: var(--success-text);
    }

    .metric-change.negative .change-badge {
      background: var(--error-bg);
      color: var(--error-text);
    }

    .metric-change.neutral .change-badge {
      color: var(--text-light);
    }

    /* Error display */
    .stage-error {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--error-bg);
      color: var(--error-text);
      font-size: 0.8rem;
      word-break: break-word;
    }

    /* Validation errors and data preview */
    .validation-errors,
    .data-preview {
      margin-top: 0.75rem;
      font-size: 0.8rem;
    }

    .validation-errors summary,
    .data-preview summary {
      cursor: pointer;
      color: var(--text-muted);
      padding: 0.25rem 0;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
    }

    .validation-errors summary {
      color: var(--error-color);
    }

    .error-list {
      list-style: none;
      padding: 0.75rem;
      margin: 0.25rem 0 0 0;
      background: var(--error-bg);
      max-height: 200px;
      overflow-y: auto;
      font-size: 0.75rem;
    }

    .error-list li {
      padding: 0.25rem 0;
      border-bottom: 1px solid #fecaca;
      word-break: break-word;
    }

    .error-list li:last-child {
      border-bottom: none;
    }

    .data-preview pre {
      background: #f5f5f5;
      padding: 0.75rem;
      margin: 0.25rem 0 0 0;
      overflow-x: auto;
      max-height: 250px;
      overflow-y: auto;
    }

    .data-preview code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.7rem;
      line-height: 1.4;
    }

    /* Connectors */
    .connector {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
      position: relative;
    }

    .connector-line {
      width: 2px;
      height: 3rem;
      background: var(--neutral-300);
      transition: background-color 0.3s ease;
    }

    .connector.active .connector-line {
      background: var(--success-color);
      box-shadow: 0 0 8px rgba(5, 150, 105, 0.3);
    }

    .connector-flow {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 12px;
      background: linear-gradient(to bottom, #84cc16, #65a30d, transparent);
      animation: slideDown 1.5s ease-in-out infinite;
    }

    @keyframes slideDown {
      0% { top: 1rem; opacity: 1; }
      100% { top: calc(1rem + 3rem); opacity: 0; }
    }

    /* Responsive */
    @media (max-width: 600px) {
      body {
        padding: 1.5rem 1rem;
      }

      .ascii-header pre {
        font-size: 0.35rem;
      }

      .status-bar {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .time-info {
        flex-direction: column;
        gap: 0.25rem;
      }

      .stage-card {
        padding: 1rem;
      }

      .metrics-table {
        font-size: 0.65rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ASCII Header -->
    <div class="ascii-header">
      <pre>
███████╗████████╗██╗         ██████╗ ██╗██████╗ ███████╗██╗     ██╗███╗   ██╗███████╗
██╔════╝╚══██╔══╝██║         ██╔══██╗██║██╔══██╗██╔════╝██║     ██║████╗  ██║██╔════╝
█████╗     ██║   ██║         ██████╔╝██║██████╔╝█████╗  ██║     ██║██╔██╗ ██║█████╗
██╔══╝     ██║   ██║         ██╔═══╝ ██║██╔═══╝ ██╔══╝  ██║     ██║██║╚██╗██║██╔══╝
███████╗   ██║   ███████╗    ██║     ██║██║     ███████╗███████╗██║██║ ╚████║███████╗
╚══════╝   ╚═╝   ╚══════╝    ╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝</pre>
      <div class="gradient-dots">
        <div class="dot" style="background: #000000;"></div>
        <div class="dot" style="background: #262626;"></div>
        <div class="dot" style="background: #525252;"></div>
        <div class="dot" style="background: #a3a3a3;"></div>
        <div class="dot" style="background: #e5e5e5;"></div>
        <div class="line"></div>
        <div class="dot" style="background: #e5e5e5;"></div>
        <div class="dot" style="background: #a3a3a3;"></div>
        <div class="dot" style="background: #525252;"></div>
        <div class="dot" style="background: #262626;"></div>
        <div class="dot" style="background: #000000;"></div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span class="stages-count">${completedStages} of ${totalStages} stages complete</span>
      <div class="time-info">
        <span><span class="label">Started:</span> ${state.startTime ? state.startTime.toLocaleTimeString() : 'N/A'}</span>
        <span><span class="label">Elapsed:</span> ${formatDuration(elapsed)}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
        ${isRunning ? '<div class="progress-shimmer"></div>' : ''}
      </div>
    </div>

    <!-- Pipeline Stages -->
    <div class="pipeline">
      ${stageNodesHtml}
    </div>
  </div>

  <script>
    // Auto-scroll to running stage
    document.addEventListener('DOMContentLoaded', () => {
      const running = document.querySelector('.stage-card.status-running');
      if (!running) return;

      const stageNumber = running.querySelector('.stage-number')?.textContent || '';
      const lastStage = sessionStorage.getItem('etl-last-stage');

      if (lastStage !== stageNumber) {
        running.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sessionStorage.setItem('etl-last-stage', stageNumber);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Get status icon HTML (SVG icons)
 */
function getStatusIconHtml(status) {
  switch (status) {
    case 'completed':
      // Lucide Check icon
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>`;
    case 'running':
      // Animated dots
      return `<div class="running-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>`;
    case 'pending':
      // Circle icon
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>`;
    case 'error':
    case 'failed':
      // X icon
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
    default:
      return '';
  }
}

/**
 * Format duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
