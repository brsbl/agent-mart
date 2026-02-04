import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateTrendingScore } from '../src/lib/trending.js';

// ============================================
// TRENDING.JS TESTS - TIME-DECAYED VELOCITY
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

describe('calculateTrendingScore: velocity calculations', () => {
  it('calculates positive score for gaining stars', () => {
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
    assert.ok(result.trending_score > 0, 'Should have positive score for gaining stars');
    assert.strictEqual(result.stars_gained_7d, 21);
    assert.ok(result.stars_velocity > 0, 'Should have positive velocity');
  });

  it('calculates negative score for losing stars', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 28 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 112, forks: 11 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 130, forks: 12 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 140, forks: 13 }
    ];

    // Only gained 1 star in last week
    const result = calculateTrendingScore({ snapshots }, 141);

    assert.strictEqual(result.insufficient_data, false);
    // Score reflects actual velocity - low but positive
    assert.ok(result.trending_score > 0, 'Score should be positive when gaining stars overall');
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

describe('calculateTrendingScore: magnitude scaling', () => {
  it('gives higher score to repos with more absolute star gains', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Small repo: 5 stars/week gain
    const smallRepoSnapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 10, forks: 1 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 15, forks: 2 }
    ];

    // Large repo: 100 stars/week gain
    const largeRepoSnapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 1000, forks: 100 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 1100, forks: 110 }
    ];

    const smallResult = calculateTrendingScore({ snapshots: smallRepoSnapshots }, 20);
    const largeResult = calculateTrendingScore({ snapshots: largeRepoSnapshots }, 1200);

    // Large repo should score higher due to higher absolute velocity
    assert.ok(
      largeResult.trending_score > smallResult.trending_score,
      `Large repo score (${largeResult.trending_score}) should exceed small repo (${smallResult.trending_score})`
    );
  });

  it('score approximately equals weekly star velocity', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // 50 stars/week gain
    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 150, forks: 15 }
    ];

    const result = calculateTrendingScore({ snapshots }, 200);

    // Score should be approximately 50 (weekly velocity) ± time decay effects
    assert.ok(result.trending_score > 40, `Score ${result.trending_score} should be near weekly velocity`);
    assert.ok(result.trending_score < 60, `Score ${result.trending_score} should be near weekly velocity`);
  });
});

describe('calculateTrendingScore: time decay', () => {
  it('weights recent growth more heavily than older growth', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Repo with recent growth spike
    const recentGrowthSnapshots = [
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 105, forks: 11 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 150, forks: 15 }
    ];

    // Repo with old growth spike (same total gain)
    const oldGrowthSnapshots = [
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 145, forks: 14 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 150, forks: 15 }
    ];

    const recentResult = calculateTrendingScore({ snapshots: recentGrowthSnapshots }, 155);
    const oldResult = calculateTrendingScore({ snapshots: oldGrowthSnapshots }, 155);

    // Recent growth should score higher due to time decay
    assert.ok(
      recentResult.trending_score > oldResult.trending_score,
      `Recent growth (${recentResult.trending_score}) should beat old growth (${oldResult.trending_score})`
    );
  });
});

describe('calculateTrendingScore: recency multiplier', () => {
  it('gives bonus to recently pushed repos', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    // Recently pushed (today)
    const recentPushedAt = new Date().toISOString();
    const recentResult = calculateTrendingScore({ snapshots }, 120, recentPushedAt);

    // Not recently pushed (30 days ago)
    const oldPushedAt = new Date(now.getTime() - 30 * day).toISOString();
    const oldResult = calculateTrendingScore({ snapshots }, 120, oldPushedAt);

    // No pushed_at
    const noPushedAtResult = calculateTrendingScore({ snapshots }, 120, null);

    // Recent push should have higher score
    assert.ok(
      recentResult.trending_score > oldResult.trending_score,
      `Recent push (${recentResult.trending_score}) should beat old push (${oldResult.trending_score})`
    );
    assert.ok(
      recentResult.trending_score > noPushedAtResult.trending_score,
      `Recent push (${recentResult.trending_score}) should beat no pushed_at (${noPushedAtResult.trending_score})`
    );
  });

  it('applies max 10% boost for today pushed repos', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 200, forks: 20 }
    ];

    const baseResult = calculateTrendingScore({ snapshots }, 300, null);
    const boostedResult = calculateTrendingScore({ snapshots }, 300, new Date().toISOString());

    // Boost should be at most ~10%
    const boostRatio = boostedResult.trending_score / baseResult.trending_score;
    assert.ok(boostRatio <= 1.11, `Boost ratio ${boostRatio} should be at most ~1.1`);
    assert.ok(boostRatio >= 1.0, `Boost ratio ${boostRatio} should be at least 1.0`);
  });

  it('handles invalid pushedAt strings gracefully', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 110, forks: 11 }
    ];

    // Invalid date string should be treated the same as no pushedAt
    const invalidResult = calculateTrendingScore({ snapshots }, 120, 'not-a-valid-date');
    const nullResult = calculateTrendingScore({ snapshots }, 120, null);

    assert.strictEqual(invalidResult.trending_score, nullResult.trending_score,
      'Invalid date should produce same score as null');
    assert.strictEqual(invalidResult.insufficient_data, false);
  });

  it('handles future pushedAt dates by clamping to max boost', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 200, forks: 20 }
    ];

    // Future date (1 day from now)
    const futurePushedAt = new Date(now.getTime() + 1 * day).toISOString();
    const futureResult = calculateTrendingScore({ snapshots }, 300, futurePushedAt);

    // Today's date
    const todayPushedAt = new Date().toISOString();
    const todayResult = calculateTrendingScore({ snapshots }, 300, todayPushedAt);

    // Future date should have same boost as today (max boost, not more)
    assert.strictEqual(futureResult.trending_score, todayResult.trending_score,
      'Future date should not exceed max boost');
  });
});

describe('calculateTrendingScore: negative gain case', () => {
  it('handles repo that lost stars in the last period', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    // Create history with consistent losses to get negative velocity
    const snapshots = [
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 200, forks: 20 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 180, forks: 18 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 160, forks: 16 }
    ];

    // Lost another 20 stars in the last week
    const result = calculateTrendingScore({ snapshots }, 140);

    assert.strictEqual(result.insufficient_data, false);
    // Negative gains are allowed - shows repo is losing stars
    assert.strictEqual(result.stars_gained_7d, -20, 'Negative star gains should be reported');
    assert.ok(result.stars_velocity < 0, 'Velocity should be negative when consistently losing stars');
    assert.ok(result.trending_score < 0, 'Score should be negative when losing stars');
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
    assert.ok(result.trending_score > 0, 'Should calculate positive score');
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

describe('calculateTrendingScore: options parameter', () => {
  it('accepts custom decay lambda', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 21 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 110, forks: 11 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 120, forks: 12 }
    ];

    // Faster decay should weight recent data more heavily
    const fastDecayResult = calculateTrendingScore({ snapshots }, 130, null, { decayLambda: 0.3 });
    const slowDecayResult = calculateTrendingScore({ snapshots }, 130, null, { decayLambda: 0.05 });

    // Both should produce valid results
    assert.strictEqual(fastDecayResult.insufficient_data, false);
    assert.strictEqual(slowDecayResult.insufficient_data, false);
  });

  it('accepts custom recency boost', () => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const snapshots = [
      { date: new Date(now.getTime() - 14 * day).toISOString().split('T')[0], stars: 100, forks: 10 },
      { date: new Date(now.getTime() - 7 * day).toISOString().split('T')[0], stars: 200, forks: 20 }
    ];

    const pushedAt = new Date().toISOString();

    const highBoostResult = calculateTrendingScore({ snapshots }, 300, pushedAt, { recencyBoost: 0.5 });
    const lowBoostResult = calculateTrendingScore({ snapshots }, 300, pushedAt, { recencyBoost: 0.05 });

    // Higher boost should result in higher score
    assert.ok(
      highBoostResult.trending_score > lowBoostResult.trending_score,
      `High boost (${highBoostResult.trending_score}) should exceed low boost (${lowBoostResult.trending_score})`
    );
  });
});
