import { describe, expect, it } from 'vitest'
import { compare } from './score'
import { segmentScores } from './segments'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: number[]): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose({ leftElbow: e }) })),
})

describe('segmentScores', () => {
  it('gir én score per del à 4 sekunder', () => {
    const ref = seq(Array(80).fill(180))
    const user = seq([...Array(40).fill(180), ...Array(40).fill(150)])
    const segments = segmentScores(compare(ref, user)!, ref)
    expect(segments.map((s) => s.score)).toEqual([100, 94])
    expect(segments[1].start).toBeCloseTo(4)
    expect(segments[1].firstStep).toBe(40)
  })
})
