import { describe, expect, it } from 'vitest'
import { decodePoses, encodePoses } from './poseFile'
import { makePose } from '../analysis/testPoses'

describe('pose files', () => {
  it('round-trips a sequence with frame times from the frame rate', () => {
    const pose = makePose()
    const seq = { fps: 15, width: 200, height: 400, frames: [{ t: 0, points: pose }, { t: 1 / 15, points: null }] }
    const back = decodePoses(JSON.parse(JSON.stringify(encodePoses(seq))))
    expect(back.frames[1]).toEqual({ t: 1 / 15, points: null })
    expect(back.frames[0].points![11].x).toBeCloseTo(pose[11].x, 1)
    expect(back.frames[0].points).toHaveLength(33)
  })
})
