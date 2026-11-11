import { describe, expect, it } from 'vitest'
import { angleAt, frameAngles, mirrorAngles } from './angles'
import { makePose } from './testPoses'

const p = (x: number, y: number) => ({ x, y, visibility: 1 })

describe('angleAt', () => {
  it('gir 90 for rett vinkel', () => {
    expect(angleAt(p(0, -1), p(0, 0), p(1, 0))).toBeCloseTo(90)
  })
  it('gir 180 for rett linje', () => {
    expect(angleAt(p(0, -1), p(0, 0), p(0, 1))).toBeCloseTo(180)
  })
})

describe('frameAngles', () => {
  it('måler albuevinkelen fra posen', () => {
    const a = frameAngles(makePose({ leftElbow: 120 }))!
    expect(a.leftElbow).toBeCloseTo(120)
    expect(a.rightElbow).toBeCloseTo(180)
  })
  it('gir null når et ledd har lav synlighet', () => {
    const pose = makePose()
    pose[25] = { ...pose[25], visibility: 0.1 }
    expect(frameAngles(pose)).toBeNull()
  })
})

describe('mirrorAngles', () => {
  it('bytter venstre og høyre', () => {
    const a = frameAngles(makePose({ leftElbow: 120 }))!
    const m = mirrorAngles(a)
    expect(m.rightElbow).toBeCloseTo(120)
    expect(m.leftElbow).toBeCloseTo(180)
  })
})
