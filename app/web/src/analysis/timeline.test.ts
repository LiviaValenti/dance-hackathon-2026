import { describe, expect, it } from 'vitest'
import { weakMoments } from './timeline'
import type { Segment } from './segments'

const window = (index: number, worstDiff: number): Segment => ({
  index, start: index / 2, end: (index + 1) / 2, score: 80, firstStep: index * 5, worstJoint: 'leftKnee', worstDiff,
})

describe('weakMoments', () => {
  it('picks the weakest windows, not next to each other, in time order', () => {
    const timeline = [5, 50, 45, 3, 30, 60, 10].map((s, i) => window(i, s))
    expect(weakMoments(timeline).map((m) => m.index)).toEqual([1, 5])
  })

  it('ignores windows where no joint is clearly off and respects the limit', () => {
    expect(weakMoments([5, 10, 25].map((s, i) => window(i, s)))).toEqual([])
    const timeline = [60, 1, 50, 1, 40, 1, 30].map((s, i) => window(i, s))
    expect(weakMoments(timeline, 2).map((m) => m.index)).toEqual([0, 2])
  })
})
