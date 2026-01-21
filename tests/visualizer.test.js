import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDuration, escapeHtml, generatePipelineHtml } from '../scripts/etl-visualizer/md-to-html.js';

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    assert.strictEqual(formatDuration(500), '500ms');
    assert.strictEqual(formatDuration(999), '999ms');
  });

  it('formats seconds', () => {
    assert.strictEqual(formatDuration(1000), '1.0s');
    assert.strictEqual(formatDuration(5500), '5.5s');
    assert.strictEqual(formatDuration(59999), '60.0s');
  });

  it('formats minutes and seconds', () => {
    assert.strictEqual(formatDuration(60000), '1m 0s');
    assert.strictEqual(formatDuration(90000), '1m 30s');
    assert.strictEqual(formatDuration(125000), '2m 5s');
  });
});

describe('escapeHtml', () => {
  it('escapes special HTML characters', () => {
    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
    assert.strictEqual(escapeHtml("it's"), "it&#039;s");
  });

  it('handles null and undefined', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  it('converts non-strings to strings', () => {
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(true), 'true');
  });

  it('returns empty string for empty input', () => {
    assert.strictEqual(escapeHtml(''), '');
  });
});

describe('generatePipelineHtml', () => {
  const createMockState = (overrides = {}) => ({
    status: 'running',
    startTime: new Date('2026-01-20T10:00:00Z'),
    stages: [
      { id: '01-discover', name: 'Discover', status: 'completed', duration: 1500 },
      { id: '02-fetch-repos', name: 'Fetch Repos', status: 'running' },
      { id: '03-fetch-trees', name: 'Fetch Trees', status: 'pending' }
    ],
    ...overrides
  });

  it('generates valid HTML structure', () => {
    const html = generatePipelineHtml(createMockState());

    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('<html lang="en">'));
    assert.ok(html.includes('</html>'));
    assert.ok(html.includes('<head>'));
    assert.ok(html.includes('<body>'));
  });

  it('includes custom title', () => {
    const html = generatePipelineHtml(createMockState(), { title: 'Custom Title' });
    assert.ok(html.includes('<title>Custom Title</title>'));
  });

  it('includes auto-refresh meta when enabled', () => {
    const html = generatePipelineHtml(createMockState(), { autoRefresh: true, refreshInterval: 5 });
    assert.ok(html.includes('<meta http-equiv="refresh" content="5">'));
  });

  it('excludes refresh meta when disabled', () => {
    const html = generatePipelineHtml(createMockState(), { autoRefresh: false });
    assert.ok(!html.includes('http-equiv="refresh"'));
  });

  it('includes stage information', () => {
    const html = generatePipelineHtml(createMockState());

    assert.ok(html.includes('Discover'));
    assert.ok(html.includes('Fetch Repos'));
    assert.ok(html.includes('Fetch Trees'));
  });

  it('includes progress calculation', () => {
    const html = generatePipelineHtml(createMockState());
    // 1 of 3 completed = 33%
    assert.ok(html.includes('1 of 3 stages complete'));
  });

  it('displays metrics for completed stages', () => {
    const state = createMockState({
      stages: [
        {
          id: '01-discover',
          name: 'Discover',
          status: 'completed',
          duration: 1500,
          metrics: {
            repos: { previous: 0, current: 5 }
          }
        }
      ]
    });

    const html = generatePipelineHtml(state);
    assert.ok(html.includes('repos'));
    assert.ok(html.includes('+5'));
  });

  it('displays error information for failed stages', () => {
    const state = createMockState({
      stages: [
        { id: '01-discover', name: 'Discover', status: 'error', error: 'API rate limit exceeded' }
      ]
    });

    const html = generatePipelineHtml(state);
    assert.ok(html.includes('API rate limit exceeded'));
  });

  it('escapes HTML in error messages', () => {
    const state = createMockState({
      stages: [
        { id: '01-discover', name: 'Discover', status: 'error', error: '<script>alert("xss")</script>' }
      ]
    });

    const html = generatePipelineHtml(state);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>alert'));
  });

  it('shows final stats for completed pipeline', () => {
    const state = {
      status: 'completed',
      startTime: new Date('2026-01-20T10:00:00Z'),
      stages: [
        {
          id: '07-output',
          name: 'Output',
          status: 'completed',
          metrics: {
            plugins: { previous: 0, current: 42 }
          }
        }
      ]
    };

    const html = generatePipelineHtml(state);
    assert.ok(html.includes('Final Output'));
    assert.ok(html.includes('42'));
  });
});
