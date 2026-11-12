import { describe, expect, it } from 'vitest'
import { checkQuality, qualityWarnings } from './quality'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (missing: (k: number) => boolean): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: Array.from({ length: 20 }, (_, k) => ({ t: k / 10, points: missing(k) ? null : makePose() })),
})

describe('checkQuality', () => {
  it('finds gaps where the body is missing', () => {
    const q = checkQuality(seq((k) => k >= 5 && k < 13))
    expect(q.validRatio).toBeCloseTo(0.6)
    expect(q.gaps).toHaveLength(1)
    expect(q.gaps[0].start).toBeCloseTo(0.5)
    expect(q.gaps[0].end).toBeCloseTo(1.3)
  })

  it('ignores short gaps and counts gaps at the end', () => {
    expect(checkQuality(seq((k) => k === 4)).gaps).toEqual([])
    expect(checkQuality(seq((k) => k >= 14)).gaps).toHaveLength(1)
  })
})

describe('qualityWarnings', () => {
  it('builds a readable warning per gap', () => {
    const w = qualityWarnings('Reference', { validRatio: 0.6, gaps: [{ start: 21, end: 24 }] })
    expect(w).toEqual(['Reference: the whole body is not visible 0:21–0:24, so the Score is less precise there.'])
  })
  it('warns about a low ratio even without clear gaps', () => {
    expect(qualityWarnings('Your Attempt', { validRatio: 0.5, gaps: [] })[0]).toContain('50%')
  })
})
