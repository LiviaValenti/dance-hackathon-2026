import { describe, expect, it } from 'vitest'
import { compare, poseMatch, toScore } from './score'
import { frameAngles } from './angles'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: Array<{ leftElbow?: number; rightElbow?: number }>): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose(e) })),
})

const wave = [180, 150, 120, 90, 120, 150, 180].map((v) => ({ leftElbow: v }))

describe('toScore', () => {
  it('gives full marks within 10 degrees and 0 from 55 degrees', () => {
    expect(toScore(0)).toBe(100)
    expect(toScore(10)).toBe(100)
    expect(toScore(55)).toBe(0)
    expect(toScore(90)).toBe(0)
  })

  it('falls off along a cosine between 10 and 55 degrees', () => {
    expect(toScore(32.5)).toBe(50)
    expect(toScore(20)).toBe(88)
    expect(toScore(45)).toBe(12)
  })
})

describe('compare', () => {
  it('gives 100 for identical sequences', () => {
    expect(compare(seq(wave), seq(wave))!.overall).toBe(100)
  })

  it('gives 100 when the Dancer is slower but otherwise equal', () => {
    const slow = wave.flatMap((f) => [f, f])
    expect(compare(seq(wave), seq(slow))!.overall).toBe(100)
  })

  it('only lowers the joint that deviates', () => {
    const ref = seq([{ leftElbow: 180 }, { leftElbow: 180 }])
    const user = seq([{ leftElbow: 150 }, { leftElbow: 150 }])
    const c = compare(ref, user)!
    expect(c.perJoint.leftElbow).toBe(59)
    expect(c.perJoint.rightElbow).toBe(100)
    expect(c.overall).toBe(95)
    expect(c.steps[0].deltas.leftElbow).toBeCloseTo(-30)
  })

  it('mirrors the Reference when mirrorRef is set', () => {
    const ref = seq([{ leftElbow: 120 }])
    const user = seq([{ rightElbow: 120 }])
    expect(compare(ref, user, { mirrorRef: true })!.overall).toBe(100)
    expect(compare(ref, user)!.overall).toBeLessThan(100)
  })

  it('skips frames without a person and gives null if none are valid', () => {
    const empty: PoseSequence = { fps: 10, width: 1, height: 1, frames: [{ t: 0, points: null }] }
    expect(compare(empty, seq(wave))).toBeNull()
  })
})

describe('poseMatch', () => {
  it('gives 100 for an equal pose or a small deviation, and lower for a large one', () => {
    const a = frameAngles(makePose())!
    expect(poseMatch(a, a)).toBe(100)
    expect(poseMatch(a, frameAngles(makePose({ leftElbow: 120 }))!)).toBe(100)
    expect(poseMatch(a, frameAngles(makePose({ leftElbow: 60, rightElbow: 60 }))!)).toBe(59)
  })
})
