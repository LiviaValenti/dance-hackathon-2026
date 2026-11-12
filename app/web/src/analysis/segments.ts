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

type Window = { start: number; end: number }

/**
 * Scores windows of the Reference. Like the overall Score, each joint is scored on its mean deviation
 * and the window's Score is the mean of those, so one badly placed joint shows up.
 */
function scoreWindows(c: Comparison, ref: PoseSequence, indexOf: (t: number) => number, bounds: (index: number) => Window): Segment[] {
  const groups = new Map<number, { sums: Record<JointName, number>; count: number; firstStep: number }>()
  c.steps.forEach((s, i) => {
    const index = indexOf(ref.frames[s.refFrame].t)
    if (index < 0) return
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
        ...bounds(index),
        score: Math.round(means.reduce((sum, [, d]) => sum + toScore(d), 0) / means.length),
        firstStep: g.firstStep,
        worstJoint: worst[0],
        worstDiff: worst[1],
      }
    })
}

/** Scores fixed-length windows from the start of the Reference. */
export function segmentScores(c: Comparison, ref: PoseSequence, segmentSeconds = SEGMENT_SECONDS): Segment[] {
  if (c.steps.length === 0) return []
  const t0 = ref.frames[c.steps[0].refFrame].t
  return scoreWindows(
    c, ref,
    (t) => Math.floor((t - t0) / segmentSeconds + 1e-9),
    (i) => ({ start: t0 + i * segmentSeconds, end: t0 + (i + 1) * segmentSeconds }),
  )
}

/** Scores given time ranges of the Reference, such as a Choreography's Parts. index is the range's position. */
export function rangeScores(c: Comparison, ref: PoseSequence, ranges: Window[]): Segment[] {
  return scoreWindows(
    c, ref,
    (t) => ranges.findIndex((r) => t >= r.start - 1e-9 && t < r.end - 1e-9),
    (i) => ({ start: ranges[i].start, end: ranges[i].end }),
  )
}
