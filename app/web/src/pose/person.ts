// Ported from poc-dance (src/person.ts). Works on normalised coordinates (0–1).
import type { Point } from './types'

type Pose = Point[]
/** A normalised position (0–1) in the frame. */
export type Spot = { x: number; y: number }

const MIN_VISIBILITY = 0.5
const seen = (point?: Point) => !!point && point.visibility >= MIN_VISIBILITY

/** Mid-hip, or the mean of the visible points when the hips are hidden. */
export function poseCenter(pose: Pose): Spot | null {
  if (seen(pose[23]) && seen(pose[24])) return { x: (pose[23].x + pose[24].x) / 2, y: (pose[23].y + pose[24].y) / 2 }
  const points = pose.filter(seen)
  if (points.length < 5) return null
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  }
}

/**
 * Picks one person when several are in view: first the one nearest `home` (the dancer the Dancer chose,
 * or the middle), then whoever is nearest where that person was. It never jumps more than maxJump to
 * someone else; after `patience` misses in a row it lets go and looks near `home` again.
 */
export function createPersonSelector(maxJump = 0.2, patience = 5, home?: Spot) {
  let last: Spot | null = null
  let misses = 0

  const lose = () => {
    if (++misses >= patience) last = null
    return null
  }

  return {
    reset() {
      last = null
      misses = 0
    },
    pick(poses: Pose[]): Pose | null {
      const candidates = poses.flatMap((pose) => {
        const center = poseCenter(pose)
        return center ? [{ pose, center }] : []
      })
      if (!candidates.length) return lose()
      // Until someone is followed, look near home and care less about height (a tap may hit the head, not the hips).
      const target = last ?? home ?? { x: 0.5, y: 0.5 }
      const weight = last ? 1 : 0.5
      const distance = (s: Spot) => Math.hypot(s.x - target.x, (s.y - target.y) * weight)
      const best = candidates.reduce((a, b) => (distance(b.center) < distance(a.center) ? b : a))
      if (last && Math.hypot(best.center.x - last.x, best.center.y - last.y) > maxJump) return lose()
      last = best.center
      misses = 0
      return best.pose
    },
  }
}
