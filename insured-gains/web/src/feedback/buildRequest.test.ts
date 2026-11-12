import { describe, expect, it } from 'vitest'
import { compare } from '../analysis/score'
import { segmentScores } from '../analysis/segments'
import { detectFaults } from '../analysis/faults'
import { makePose } from '../analysis/testPoses'
import { buildRequest } from './buildRequest'
import type { PoseSequence } from '../pose/types'

const seq = (elbows: number[]): PoseSequence => ({
  fps: 10, width: 200, height: 400,
  frames: elbows.map((e, k) => ({ t: k / 10, points: makePose({ leftElbow: e }) })),
})

describe('buildRequest', () => {
  it('lager et kompakt sammendrag med 1-baserte deler og norske titler', () => {
    const ref = seq(Array(20).fill(180))
    const user = seq(Array.from({ length: 20 }, (_, k) => (k >= 5 && k < 15 ? 140 : 180)))
    const c = compare(ref, user)!
    const req = buildRequest(c, segmentScores(c, ref), detectFaults(c, ref))
    expect(req.segments[0].index).toBe(1)
    expect(req.faults).toEqual([{ id: 'f1', title: 'Strekk venstre arm mer', start: 0.5, end: 1.5, degrees: 40 }])
    expect(req.strengths.length).toBeGreaterThan(0)
  })
})
