import { describe, expect, it } from 'vitest'
import { bodyAreaScores } from './bodyAreas'

describe('bodyAreaScores', () => {
  it('slår sammen ledd til armer, hofter og bein', () => {
    const perJoint = {
      leftElbow: 80, rightElbow: 90, leftShoulder: 70, rightShoulder: 60,
      leftHip: 100, rightHip: 90, leftKnee: 50, rightKnee: 61,
    }
    expect(bodyAreaScores({ perJoint })).toEqual([
      { label: 'Armer', score: 75 },
      { label: 'Hofter', score: 95 },
      { label: 'Bein', score: 56 },
    ])
  })
})
