/**
 * Trending score calculation using time-decayed velocity algorithm
 *
 * The algorithm prioritizes absolute star velocity while weighting recent activity
 * more heavily using exponential time decay:
 *
 * trending_score = time_decayed_velocity × 7 × recency_multiplier
 *
 * Where:
 *   time_decayed_velocity = weighted daily star gain (recent days count more)
 *   recency_multiplier = 1 + RECENCY_BOOST × max(0, 1 - days_since_push / RECENCY_HALFLIFE)
 */

// Tunable parameters
const DECAY_LAMBDA = 0.1;      // Time decay rate (~50% weight at 7 days ago)
const RECENCY_HALFLIFE = 14;   // Days until recency bonus = 0
const RECENCY_BOOST = 0.1;     // Max 10% boost for recently pushed repos

/**
 * Calculate trending score for a repository based on its history
 *
 * @param {Object} repoHistory - Repository history from signals-history.json
 * @param {Array} repoHistory.snapshots - Array of {date, stars, forks}
 * @param {number} currentStars - Current star count
 * @param {string|null} pushedAt - ISO date string of last push (optional)
 * @param {Object} options - Algorithm tuning options (optional)
 * @param {number} options.decayLambda - Time decay rate (default 0.1)
 * @param {number} options.recencyHalflife - Days until recency bonus = 0 (default 14)
 * @param {number} options.recencyBoost - Max recency boost factor (default 0.1)
 * @returns {{trending_score: number, stars_gained_7d: number, stars_velocity: number, insufficient_data: boolean}}
 */
export function calculateTrendingScore(repoHistory, currentStars, pushedAt = null, options = {}) {
  const snapshots = repoHistory?.snapshots ?? [];

  // Need at least 2 data points for meaningful calculation
  if (snapshots.length < 2) {
    return {
      trending_score: 0,
      stars_gained_7d: 0,
      stars_velocity: 0,
      insufficient_data: true
    };
  }

  const {
    decayLambda = DECAY_LAMBDA,
    recencyHalflife = RECENCY_HALFLIFE,
    recencyBoost = RECENCY_BOOST
  } = options;

  // Sort snapshots by date to ensure chronological order
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Calculate time-decayed velocity from daily gains
  // Weight = e^(-λ × days_ago)
  let weightedGainSum = 0;
  let weightSum = 0;

  for (let i = 1; i < sortedSnapshots.length; i++) {
    const prevDate = new Date(sortedSnapshots[i - 1].date);
    const currDate = new Date(sortedSnapshots[i].date);
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / day;

    if (daysDiff > 0) {
      const currStars = sortedSnapshots[i].stars ?? 0;
      const prevStars = sortedSnapshots[i - 1].stars ?? 0;
      const gain = currStars - prevStars;

      // Skip if values are not valid numbers
      if (!Number.isFinite(gain)) continue;

      // Calculate daily rate for this period
      const dailyRate = gain / daysDiff;

      // Days ago is measured from the midpoint of the period
      const midpointMs = (prevDate.getTime() + currDate.getTime()) / 2;
      const daysAgo = (now - midpointMs) / day;

      // Apply exponential decay weight
      const weight = Math.exp(-decayLambda * daysAgo);

      weightedGainSum += dailyRate * weight;
      weightSum += weight;
    }
  }

  // If no valid gains calculated, return defaults
  if (weightSum === 0) {
    return {
      trending_score: 0,
      stars_gained_7d: 0,
      stars_velocity: 0,
      insufficient_data: true
    };
  }

  // Time-decayed daily velocity (used for trending_score calculation)
  const velocity = weightedGainSum / weightSum;

  // Find stars gained in the last 7 days for display
  // Note: stars_gained_7d is the raw difference from ~7 days ago, while velocity
  // is time-weighted. These values can diverge when growth patterns are uneven.
  const sevenDaysAgoMs = now - 7 * day;

  // Find the most recent snapshot that is at least 7 days old
  let referenceSnapshot = null;
  for (let i = sortedSnapshots.length - 1; i >= 0; i--) {
    const snapshotMs = new Date(sortedSnapshots[i].date).getTime();
    if (snapshotMs <= sevenDaysAgoMs) {
      referenceSnapshot = sortedSnapshots[i];
      break;
    }
  }

  // If no snapshot is 7+ days old, use the oldest available
  if (!referenceSnapshot) {
    referenceSnapshot = sortedSnapshots[0];
  }

  const starsGained7d = currentStars - (referenceSnapshot.stars ?? 0);

  // Calculate recency multiplier based on pushed_at
  let recencyMultiplier = 1;
  if (pushedAt) {
    const pushedAtMs = new Date(pushedAt).getTime();
    if (!Number.isNaN(pushedAtMs)) {
      const daysSincePush = Math.max(0, (now - pushedAtMs) / day);
      const recencyFactor = Math.max(0, 1 - daysSincePush / recencyHalflife);
      recencyMultiplier = 1 + recencyBoost * recencyFactor;
    }
  }

  // Final score: weekly equivalent with recency boost
  const trendingScore = velocity * 7 * recencyMultiplier;

  return {
    trending_score: roundToTwoDecimals(trendingScore),
    stars_gained_7d: starsGained7d,
    stars_velocity: roundToTwoDecimals(velocity),
    insufficient_data: false
  };
}

/**
 * Round a number to two decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
function roundToTwoDecimals(num) {
  return Math.round(num * 100) / 100;
}
