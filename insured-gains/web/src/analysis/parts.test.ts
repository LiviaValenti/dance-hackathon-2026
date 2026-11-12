import { describe, expect, it } from 'vitest'
import { sliceSequence, splitParts } from './parts'
import { makePose } from './testPoses'
import type { PoseSequence } from '../pose/types'

describe('splitParts', () => {
  it('deler i biter à 4 sekunder og slår en kort siste bit sammen med forrige', () => {
    expect(splitParts(0, 13)).toEqual([
      { index: 0, start: 0, end: 4 },
      { index: 1, start: 4, end: 8 },
      { index: 2, start: 8, end: 13 },
    ])
    expect(splitParts(2, 10)).toEqual([
      { index: 0, start: 2, end: 6 },
      { index: 1, start: 6, end: 10 },
    ])
  })
  it('gir én del for korte videoer', () => {
    expect(splitParts(0, 3)).toEqual([{ index: 0, start: 0, end: 3 }])
  })
})

describe('sliceSequence', () => {
  it('beholder bildene i tidsrommet', () => {
    const seq: PoseSequence = {
      fps: 10, width: 1, height: 1,
      frames: Array.from({ length: 20 }, (_, k) => ({ t: k / 10, points: makePose() })),
    }
    expect(sliceSequence(seq, 0.5, 1).frames.map((f) => f.t)).toEqual([0.5, 0.6, 0.7, 0.8, 0.9])
  })
})
