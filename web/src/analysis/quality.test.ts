import { describe, expect, it } from 'vitest'
import { checkQuality, qualityWarnings } from './quality'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (missing: (k: number) => boolean): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: Array.from({ length: 20 }, (_, k) => ({ t: k / 10, points: missing(k) ? null : makePose() })),
})

describe('checkQuality', () => {
  it('finner hull der kroppen mangler', () => {
    const q = checkQuality(seq((k) => k >= 5 && k < 13))
    expect(q.validRatio).toBeCloseTo(0.6)
    expect(q.gaps).toHaveLength(1)
    expect(q.gaps[0].start).toBeCloseTo(0.5)
    expect(q.gaps[0].end).toBeCloseTo(1.3)
  })

  it('ignorerer korte hull og hull på slutten telles med', () => {
    expect(checkQuality(seq((k) => k === 4)).gaps).toEqual([])
    expect(checkQuality(seq((k) => k >= 14)).gaps).toHaveLength(1)
  })
})

describe('qualityWarnings', () => {
  it('lager en lesbar advarsel per hull', () => {
    const w = qualityWarnings('Referansen', { validRatio: 0.6, gaps: [{ start: 21, end: 24 }] })
    expect(w).toEqual(['Referansen: hele kroppen er ikke synlig 0:21–0:24, så scoren er mindre presis der.'])
  })
  it('advarer om lav andel også uten tydelige hull', () => {
    expect(qualityWarnings('Ditt forsøk', { validRatio: 0.5, gaps: [] })[0]).toContain('50 %')
  })
})
