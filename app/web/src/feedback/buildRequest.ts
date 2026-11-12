import { topStrengths, type Fault } from '../analysis/faults'
import { faultTitle } from '../analysis/faultText'
import type { Comparison } from '../analysis/score'
import type { Segment } from '../analysis/segments'
import type { FeedbackRequest } from './types'
import { text } from '../text'

export const faultId = (index: number) => `f${index + 1}`

const round1 = (n: number) => Math.round(n * 10) / 10

export function buildRequest(c: Comparison, segments: Segment[], faults: Fault[]): FeedbackRequest {
  return {
    overall: c.overall,
    segments: segments.map((s) => ({ index: s.index + 1, score: s.score })),
    strengths: topStrengths(c).map((j) => text.joints[j]),
    faults: faults.map((f, i) => ({
      id: faultId(i),
      title: faultTitle(f),
      start: round1(f.start),
      end: round1(f.end),
      degrees: Math.round(f.meanDelta),
    })),
  }
}
