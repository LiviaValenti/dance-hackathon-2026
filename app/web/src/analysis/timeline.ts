import { segmentScores, type Segment } from './segments'
import { WARN_DIFF_DEG, type Comparison } from './score'
import type { PoseSequence } from '../pose/types'

/** Width of one timeline window, from new-chapter's scoring.py. */
export const TIMELINE_SECONDS = 0.5

/** Score per half second of the Reference, with the worst joint in each window. */
export function timelineScores(c: Comparison, ref: PoseSequence): Segment[] {
  return segmentScores(c, ref, TIMELINE_SECONDS)
}

/**
 * Windows where one joint is clearly off (as in new-chapter, judged by the worst joint, since one wrong arm
 * barely moves a window's average). The worst ones first, never two next to each other, in time order.
 */
export function weakMoments(timeline: Segment[], limit = 3): Segment[] {
  const chosen: Segment[] = []
  for (const w of [...timeline].sort((a, b) => b.worstDiff - a.worstDiff)) {
    if (chosen.length >= limit || w.worstDiff <= WARN_DIFF_DEG) break
    if (chosen.every((c) => Math.abs(c.index - w.index) > 1)) chosen.push(w)
  }
  return chosen.sort((a, b) => a.index - b.index)
}
