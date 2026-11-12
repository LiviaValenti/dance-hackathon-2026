/** The last step whose time is at or before t. times must not decrease (DTW steps are in order). */
export function stepAtTime(times: number[], t: number): number {
  let lo = 0
  let hi = times.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (times[mid] <= t + 1e-6) lo = mid
    else hi = mid - 1
  }
  return lo
}

const SEEK_ABOVE = 0.4
const MAX_NUDGE = 0.5

/**
 * Keeps a second video in step with the first while both play: small drift is evened out by playing a
 * little faster or slower, large drift by seeking (seeking every frame makes videos stall).
 */
export function syncRate(current: number, target: number): { seek: boolean; rate: number } {
  const drift = target - current
  if (Math.abs(drift) > SEEK_ABOVE) return { seek: true, rate: 1 }
  return { seek: false, rate: 1 + Math.max(-MAX_NUDGE, Math.min(MAX_NUDGE, drift * 2)) }
}
