import { describe, expect, it } from 'vitest'
import { compare } from './score'
import { rangeScores, segmentScores } from './segments'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: number[]): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose({ leftElbow: e }) })),
})

describe('segmentScores', () => {
  it('gives one Score per 4-second Part', () => {
    const ref = seq(Array(80).fill(180))
    const user = seq([...Array(40).fill(180), ...Array(40).fill(150)])
    const segments = segmentScores(compare(ref, user)!, ref)
    expect(segments.map((s) => s.score)).toEqual([100, 95])
    expect(segments[1].worstJoint).toBe('leftElbow')
    expect(segments[1].worstDiff).toBeCloseTo(30)
    expect(segments[1].start).toBeCloseTo(4)
    expect(segments[1].firstStep).toBe(40)
  })
})

describe('rangeScores', () => {
  it('scores given ranges, such as a Choreography’s Parts', () => {
    const ref = seq(Array(60).fill(180))
    const user = seq([...Array(30).fill(180), ...Array(30).fill(120)])
    const parts = rangeScores(compare(ref, user)!, ref, [{ start: 0, end: 3 }, { start: 3, end: 6 }])
    expect(parts.map((p) => p.index)).toEqual([0, 1])
    expect(parts[0].score).toBe(100)
    expect(parts[1].score).toBeLessThan(100)
    expect(parts[1].start).toBe(3)
  })
})
