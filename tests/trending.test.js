import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateTrendingScore } from '../src/lib/trending.js';

// ============================================
// TRENDING.JS TESTS - Z-SCORE ALGORITHM
// ============================================

describe('calculateTrendingScore: basic cases', () => {
  it('returns insufficient_data for repos with empty snapshots array', () => {
    const result = calculateTrendingScore({ snapshots: [] }, 100);
    assert.strictEqual(result.insufficient_data, true);
    assert.strictEqual(result.trending_score, 0);
    assert.strictEqual(result.stars_gained_7d, 0);
    assert.strictEqual(result.stars_velocity, 0);
  });

  it('returns insufficient_data for repos with only 1 snapshot', () => {
    const result = calculateTrendingScore({
      snapshots: [{ date: '2025-01-01', stars: 50, forks: 5 }]
    }, 100);
    assert.strictEqual(result.insufficient_data, true);
    assert.strictEqual(result.trending_score, 0);
  });

  it('returns insufficient_data for null/undefined input', () => {
    const resultNull = calculateTrendingScore(null, 100);
    assert.strictEqual(resultNull.insufficient_data, true);
    assert.strictEqual(resultNull.trending_score, 0);

    const resultUndefined = calculateTrendingScore(undefined, 100);
    assert.strictEqual(resultUndefined.insufficient_data, true);
    assert.strictEqual(resultUndefined.trending_score, 0);
  });

  it('returns insufficient_data for missing snapshots property', () => {
    const result = calculateTrendingScore({}, 100);
    assert.strictEqual(result.insufficient_data, true);
    assert.strictEqual(result.trending_score, 0);
  });
});

describe('calculateTrendingScore: normal calculations', () => {
  it('calculates positive z-score for above-average growth', () => {
    // Create history with consistent growth of ~7 stars/week
    // Then test with current stars showing higher recent growth
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 107, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 114, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 121, forks: 13 }
    ];

    // Current stars show 21 stars gained in last 7 days (3x normal)
    const result = calculateTrendingScore({ snapshots }, 142);

    assert.strictEqual(result.insufficient_data, false);
    assert.ok(result.trending_score > 0, 'Should have positive z-score for above-average growth');
    assert.strictEqual(result.stars_gained_7d, 21);
    assert.ok(result.stars_velocity > 0, 'Should have positive velocity');
  });

  it('calculates negative z-score for below-average growth', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Create history with varying gains to have non-zero variance
    // Average gain per week: (12 + 18 + 10) / 3 = ~13.33 stars/week
    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 112, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 130, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 140, forks: 13 }
    ];

    // Only gained 1 star in last week (significantly below average)
    const result = calculateTrendingScore({ snapshots }, 141);

    assert.strictEqual(result.insufficient_data, false);
    assert.ok(result.trending_score < 0, `Should have negative z-score for below-average growth, got ${result.trending_score}`);
    assert.strictEqual(result.stars_gained_7d, 1);
  });

  it('handles unsorted snapshots correctly', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Snapshots in random order
    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 114, forks: 12 },
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 121, forks: 13 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 107, forks: 11 }
    ];

    const result = calculateTrendingScore({ snapshots }, 128);

    assert.strictEqual(result.insufficient_data, false);
    assert.strictEqual(result.stars_gained_7d, 7);
  });
});

describe('calculateTrendingScore: zero variance case', () => {
  it('handles zero variance when current gain is below or equal to mean', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // All weeks have exactly 7 stars gained (zero variance)
    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 107, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 114, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 121, forks: 13 }
    ];

    // Current gain is 0 (well below the mean of 7)
    const result = calculateTrendingScore({ snapshots }, 121);

    assert.strictEqual(result.insufficient_data, false);
    // Zero variance and gain below mean should result in z-score of 0
    assert.strictEqual(result.trending_score, 0);
    assert.strictEqual(result.stars_gained_7d, 0);
  });

  it('handles zero variance when current gain is above mean', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // All weeks have exactly 7 stars gained (zero variance)
    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 107, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 114, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 121, forks: 13 }
    ];

    // Current gain is 21 (3x the historical mean of 7)
    const result = calculateTrendingScore({ snapshots }, 142);

    assert.strictEqual(result.insufficient_data, false);
    // Zero variance but above mean should give a mild positive score
    assert.strictEqual(result.trending_score, 1);
    assert.strictEqual(result.stars_gained_7d, 21);
  });
});

describe('calculateTrendingScore: negative gain case', () => {
  it('handles repo that lost stars in the last period', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Create history with varying positive gains to have non-zero variance
    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 112, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 120, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 135, forks: 13 }
    ];

    // Lost 10 stars in the last week - negative gains are valid data
    const result = calculateTrendingScore({ snapshots }, 125);

    assert.strictEqual(result.insufficient_data, false);
    // Negative gains are allowed - shows repo is losing stars
    assert.strictEqual(result.stars_gained_7d, -10, 'Negative star gains should be reported');
    assert.ok(result.stars_velocity < 0, 'Velocity should be negative when losing stars');
    // z-score will be negative because -10 is well below historical mean
    assert.ok(result.trending_score < 0, `Should have negative z-score when losing stars, got ${result.trending_score}`);
  });

  it('handles mixed history with negative gains', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // History includes a week where stars decreased
    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 90, forks: 9 },  // Lost 10
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    const result = calculateTrendingScore({ snapshots }, 120);

    assert.strictEqual(result.insufficient_data, false);
    assert.strictEqual(result.stars_gained_7d, 10);
  });
});

describe('calculateTrendingScore: edge cases', () => {
  it('handles exactly 2 snapshots (minimum for calculation)', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 1 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    const result = calculateTrendingScore({ snapshots }, 115);

    assert.strictEqual(result.insufficient_data, false);
    // With only 2 snapshots, we have 1 data point for gains
    // stdDev would be 0 (single data point variance is 0)
  });

  it('handles snapshots with zero days difference', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const today = new Date(now.getTime() - 1 * day).toISOString().split('T')[0];

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: today, stars: 110, forks: 11 },
      { date: today, stars: 110, forks: 11 }  // Same date as previous
    ];

    // Should not crash with division by zero
    const result = calculateTrendingScore({ snapshots }, 115);
    assert.strictEqual(result.insufficient_data, false);
  });

  it('handles very old snapshots (all older than 7 days)', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 60 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 53 * day).toISOString().split('T')[0], stars: 107, forks: 11 },
      { date: new Date(now.getTime() - 46 * day).toISOString().split('T')[0], stars: 114, forks: 12 }
    ];

    const result = calculateTrendingScore({ snapshots }, 150);

    assert.strictEqual(result.insufficient_data, false);
    // Should use the most recent snapshot that is at least 7 days old
    assert.ok(result.stars_gained_7d > 0);
  });

  it('handles snapshots all newer than 7 days', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 5 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 3 * day).toISOString().split('T')[0], stars: 105, forks: 11 },
      { date: new Date(now.getTime() - 1 * day).toISOString().split('T')[0], stars: 110, forks: 12 }
    ];

    const result = calculateTrendingScore({ snapshots }, 115);

    assert.strictEqual(result.insufficient_data, false);
    // Should fall back to oldest snapshot for reference
    assert.strictEqual(result.stars_gained_7d, 15);  // 115 - 100
  });
});

describe('calculateTrendingScore: return value format', () => {
  it('returns all expected fields', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    const result = calculateTrendingScore({ snapshots }, 120);

    assert.ok('trending_score' in result, 'Should have trending_score field');
    assert.ok('stars_gained_7d' in result, 'Should have stars_gained_7d field');
    assert.ok('stars_velocity' in result, 'Should have stars_velocity field');
    assert.ok('insufficient_data' in result, 'Should have insufficient_data field');
  });

  it('returns numbers rounded to 2 decimal places', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 113, forks: 11 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 119, forks: 12 }
    ];

    const result = calculateTrendingScore({ snapshots }, 133);

    // Check that numeric values are properly rounded
    const trendingDecimals = (result.trending_score.toString().split('.')[1] || '').length;
    const velocityDecimals = (result.stars_velocity.toString().split('.')[1] || '').length;

    assert.ok(trendingDecimals <= 2, 'trending_score should have at most 2 decimal places');
    assert.ok(velocityDecimals <= 2, 'stars_velocity should have at most 2 decimal places');
  });

  it('returns integer for stars_gained_7d', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    const result = calculateTrendingScore({ snapshots }, 123);

    assert.strictEqual(Number.isInteger(result.stars_gained_7d), true);
    assert.strictEqual(result.stars_gained_7d, 13);
  });
});
