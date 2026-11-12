import { describe, expect, it } from 'vitest'
import { angleAt, frameAngles, mirrorAngles } from './angles'
import { makePose } from './testPoses'

const p = (x: number, y: number) => ({ x, y, visibility: 1 })

describe('angleAt', () => {
  it('gives 90 for a right angle', () => {
    expect(angleAt(p(0, -1), p(0, 0), p(1, 0))).toBeCloseTo(90)
  })
  it('gives 180 for a straight line', () => {
    expect(angleAt(p(0, -1), p(0, 0), p(0, 1))).toBeCloseTo(180)
  })
})

describe('frameAngles', () => {
  it('measures the elbow angle from the pose', () => {
    const a = frameAngles(makePose({ leftElbow: 120 }))!
    expect(a.leftElbow).toBeCloseTo(120)
    expect(a.rightElbow).toBeCloseTo(180)
  })
  it('gives null when a joint has low visibility', () => {
    const pose = makePose()
    pose[25] = { ...pose[25], visibility: 0.1 }
    expect(frameAngles(pose)).toBeNull()
  })
})

describe('mirrorAngles', () => {
  it('swaps left and right', () => {
    const a = frameAngles(makePose({ leftElbow: 120 }))!
    const m = mirrorAngles(a)
    expect(m.rightElbow).toBeCloseTo(120)
    expect(m.leftElbow).toBeCloseTo(180)
  })
})
