import { JOINT_NAMES, type JointName } from './angles'
import { toScore, type Comparison } from './score'
import type { PoseSequence } from '../pose/types'

/** A time window of the Reference with its Score. index is 0-based; start/end are seconds in the Reference. */
export type Segment = {
  index: number
  start: number
  end: number
  score: number
  firstStep: number
  /** The joint with the largest mean deviation in the window. */
  worstJoint: JointName
  /** Mean deviation of the worst joint, in degrees. */
  worstDiff: number
}

export const SEGMENT_SECONDS = 4

/**
 * Scores fixed windows of the Reference. Like the overall Score, each joint is scored on its mean deviation
 * and the window's Score is the mean of those, so one badly placed joint shows up.
 */
export function segmentScores(c: Comparison, ref: PoseSequence, segmentSeconds = SEGMENT_SECONDS): Segment[] {
  if (c.steps.length === 0) return []
  const t0 = ref.frames[c.steps[0].refFrame].t
  const groups = new Map<number, { sums: Record<JointName, number>; count: number; firstStep: number }>()
  c.steps.forEach((s, i) => {
    const index = Math.floor((ref.frames[s.refFrame].t - t0) / segmentSeconds + 1e-9)
    let g = groups.get(index)
    if (!g) {
      g = { sums: Object.fromEntries(JOINT_NAMES.map((n) => [n, 0])) as Record<JointName, number>, count: 0, firstStep: i }
      groups.set(index, g)
    }
    for (const n of JOINT_NAMES) g.sums[n] += s.diffs[n]
    g.count += 1
  })
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, g]) => {
      const means = JOINT_NAMES.map((n) => [n, g.sums[n] / g.count] as const)
      const worst = means.reduce((a, b) => (b[1] > a[1] ? b : a))
      return {
        index,
        start: t0 + index * segmentSeconds,
        end: t0 + (index + 1) * segmentSeconds,
        score: Math.round(means.reduce((sum, [, d]) => sum + toScore(d), 0) / means.length),
        firstStep: g.firstStep,
        worstJoint: worst[0],
        worstDiff: worst[1],
      }
    })
}
