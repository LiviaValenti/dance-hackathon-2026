import { describe, expect, it } from 'vitest'
import { compare, toScore } from './score'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: Array<{ leftElbow?: number; rightElbow?: number }>): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose(e) })),
})

const wave = [180, 150, 120, 90, 120, 150, 180].map((v) => ({ leftElbow: v }))

describe('toScore', () => {
  it('gir 100 for null avvik og 0 for 60 grader eller mer', () => {
    expect(toScore(0)).toBe(100)
    expect(toScore(30)).toBe(50)
    expect(toScore(90)).toBe(0)
  })
})

describe('compare', () => {
  it('gir 100 for identiske sekvenser', () => {
    expect(compare(seq(wave), seq(wave))!.overall).toBe(100)
  })

  it('gir 100 når brukeren er saktere, men ellers lik', () => {
    const slow = wave.flatMap((f) => [f, f])
    expect(compare(seq(wave), seq(slow))!.overall).toBe(100)
  })

  it('trekker bare ned leddet som avviker', () => {
    const ref = seq([{ leftElbow: 180 }, { leftElbow: 180 }])
    const user = seq([{ leftElbow: 150 }, { leftElbow: 150 }])
    const c = compare(ref, user)!
    expect(c.perJoint.leftElbow).toBe(50)
    expect(c.perJoint.rightElbow).toBe(100)
    expect(c.overall).toBe(94)
  })

  it('speiler referansen når mirrorRef er satt', () => {
    const ref = seq([{ leftElbow: 120 }])
    const user = seq([{ rightElbow: 120 }])
    expect(compare(ref, user, { mirrorRef: true })!.overall).toBe(100)
    expect(compare(ref, user)!.overall).toBeLessThan(100)
  })

  it('hopper over frames uten person og gir null hvis ingen er gyldige', () => {
    const empty: PoseSequence = { fps: 10, width: 1, height: 1, frames: [{ t: 0, points: null }] }
    expect(compare(empty, seq(wave))).toBeNull()
  })
})
