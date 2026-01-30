/**
 * Trending score calculation using z-score algorithm
 *
 * The z-score measures how many standard deviations a value is from the mean:
 * z = (x - μ) / σ
 *
 * Where:
 *   x = stars gained in the last 7 days
 *   μ = mean weekly star gain (from history)
 *   σ = standard deviation of weekly star gains
 */

/**
 * Calculate trending score for a repository based on its history
 *
 * @param {Object} repoHistory - Repository history from signals-history.json
 * @param {Array} repoHistory.snapshots - Array of {date, stars, forks}
 * @param {number} currentStars - Current star count
 * @returns {{trending_score: number, stars_gained_7d: number, stars_velocity: number, insufficient_data: boolean}}
 */
export function calculateTrendingScore(repoHistory, currentStars) {
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

  // Sort snapshots by date to ensure chronological order
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate weekly gains from history (normalized to 7-day periods)
  const weeklyGains = [];
  for (let i = 1; i < sortedSnapshots.length; i++) {
    const prevDate = new Date(sortedSnapshots[i - 1].date);
    const currDate = new Date(sortedSnapshots[i].date);
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);

    if (daysDiff > 0) {
      const currStars = sortedSnapshots[i].stars ?? 0;
      const prevStars = sortedSnapshots[i - 1].stars ?? 0;
      const gain = currStars - prevStars;
      // Skip if values are not valid numbers
      if (!Number.isFinite(gain)) continue;
      // Normalize to weekly equivalent
      const weeklyEquivalent = (gain / daysDiff) * 7;
      weeklyGains.push(weeklyEquivalent);
    }
  }

  // If no valid gains calculated, return defaults
  if (weeklyGains.length === 0) {
    return {
      trending_score: 0,
      stars_gained_7d: 0,
      stars_velocity: 0,
      insufficient_data: true
    };
  }

  // Calculate mean of weekly gains
  const mean = weeklyGains.reduce((sum, g) => sum + g, 0) / weeklyGains.length;

  // Calculate variance and standard deviation (using sample std dev for small datasets)
  const divisor = weeklyGains.length > 1 ? weeklyGains.length - 1 : weeklyGains.length;
  const variance = weeklyGains.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / divisor;
  const stdDev = Math.sqrt(variance);

  // Find stars gained in the last 7 days
  // Look for the snapshot closest to (but not after) 7 days ago
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Find the most recent snapshot that is at least 7 days old
  // or the oldest snapshot if none are 7+ days old
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

  // Clamp to 0 - negative gains (star removals) aren't meaningful for trending
  const starsGained7d = Math.max(0, currentStars - referenceSnapshot.stars);

  // Calculate actual days elapsed since reference snapshot
  const actualDays = Math.max(1, (Date.now() - new Date(referenceSnapshot.date).getTime()) / (24 * 60 * 60 * 1000));

  // Normalize gain to 7-day equivalent for z-score calculation (matches mean/stdDev normalization)
  const normalizedGain = (starsGained7d / actualDays) * 7;

  // Calculate z-score using normalized gain
  let zScore = 0;
  if (stdDev > 0) {
    zScore = (normalizedGain - mean) / stdDev;
  } else if (normalizedGain > mean) {
    // Zero variance but gained more than usual - give a mild positive score
    zScore = normalizedGain > 0 ? 1 : 0;
  }
  // If stdDev is 0 and normalizedGain <= mean, zScore stays 0

  // Calculate velocity (actual daily rate)
  const velocity = starsGained7d / actualDays;

  return {
    trending_score: roundToTwoDecimals(zScore),
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
