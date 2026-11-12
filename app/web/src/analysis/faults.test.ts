import { describe, expect, it } from 'vitest'
import { compare } from './score'
import { detectFaults, topStrengths } from './faults'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: number[]): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose({ leftElbow: e }) })),
})

const ref = seq(Array(20).fill(180))

describe('detectFaults', () => {
  it('finds a continuous deviation with range and direction', () => {
    const user = seq(Array.from({ length: 20 }, (_, k) => (k >= 5 && k < 15 ? 140 : 180)))
    const faults = detectFaults(compare(ref, user)!, ref)
    expect(faults).toHaveLength(1)
    expect(faults[0].joint).toBe('leftElbow')
    expect(faults[0].direction).toBe('smaller')
    expect(faults[0].start).toBeCloseTo(0.5)
    expect(faults[0].end).toBeCloseTo(1.5)
    expect(faults[0].meanDelta).toBeCloseTo(40)
  })

  it('ignores short blips under 0.3 seconds', () => {
    const user = seq(Array.from({ length: 20 }, (_, k) => (k === 3 ? 140 : 180)))
    expect(detectFaults(compare(ref, user)!, ref)).toEqual([])
  })
})

describe('topStrengths', () => {
  it('returns high-scoring joints, best first', () => {
    const user = seq(Array(20).fill(150))
    const strengths = topStrengths(compare(ref, user)!)
    expect(strengths).toHaveLength(3)
    expect(strengths).not.toContain('leftElbow')
  })
})
