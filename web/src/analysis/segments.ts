import { JOINT_NAMES } from './angles'
import { toScore, type Comparison } from './score'
import type { PoseSequence } from '../pose/types'

/** index er 0-basert; start/end er sekunder i referansen. */
export type Segment = { index: number; start: number; end: number; score: number; firstStep: number }

export const SEGMENT_SECONDS = 4

export function segmentScores(c: Comparison, ref: PoseSequence, segmentSeconds = SEGMENT_SECONDS): Segment[] {
  if (c.steps.length === 0) return []
  const t0 = ref.frames[c.steps[0].refFrame].t
  const groups = new Map<number, { sum: number; count: number; firstStep: number }>()
  c.steps.forEach((s, i) => {
    const index = Math.floor((ref.frames[s.refFrame].t - t0) / segmentSeconds)
    const g = groups.get(index) ?? { sum: 0, count: 0, firstStep: i }
    for (const n of JOINT_NAMES) g.sum += s.diffs[n]
    g.count += JOINT_NAMES.length
    groups.set(index, g)
  })
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, g]) => ({
      index,
      start: t0 + index * segmentSeconds,
      end: t0 + (index + 1) * segmentSeconds,
      score: toScore(g.sum / g.count),
      firstStep: g.firstStep,
    }))
}
